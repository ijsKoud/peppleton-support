import { join } from "path";
import {
	Collection,
	Message,
	MessageEmbed,
	MessageReaction,
	User,
	GuildCreateChannelOptions,
	PermissionString,
	OverwriteResolvable,
	TextChannel,
	GuildMember,
	MessageAttachment,
} from "discord.js";
import { iDepartment, iTicket } from "../../models/interfaces";
import prClient from "../../client/client";
import Ticket from "../../models/support/Ticket";
import Transcript from "../transcript/Transcript";
import { nanoid } from "nanoid";

export default class ticketHandler {
	public tickets = new Collection<string, iTicket>();
	constructor(public client: prClient) {}

	public async handleMessages(message: Message): Promise<void> {
		switch (message.channel.type) {
			case "dm":
				{
					let ticket = this.tickets.find(
						({ userId, status }) => userId === message.author.id && status === "open"
					);
					if (!ticket) {
						ticket = (
							await Ticket.findOne({ userId: message.author.id, status: "open" })
						)?.toObject?.();
						if (!ticket) return;

						this.tickets.set(ticket.caseId, ticket);
						setTimeout(() => this.tickets.delete(ticket.caseId), 5e3);
					}

					if (
						(!message.content && !message.attachments.size) ||
						message.content.trim().startsWith(this.client.commandHandler.prefix as string)
					)
						return;
					message.content = this.substr(message.content || "no message content", 1500);
					await this.handleDM(message, ticket);
				}
				break;
			case "text":
				{
					let ticket = this.tickets.get(message.channel.name);
					if (!ticket) {
						ticket = (await Ticket.findOne({ caseId: message.channel.name }))?.toObject?.();
						if (!ticket) return;

						this.tickets.set(ticket.caseId, ticket);
						setTimeout(() => this.tickets.delete(ticket.caseId), 5e3);
					}

					if (ticket.status !== "open" || ticket.claimerId !== message.author.id) return;
					const [cmd, ...args] = (message.content || "").trim().split(/ +/g);
					if (
						!cmd ||
						cmd.toLowerCase() !== `${this.client.commandHandler.prefix}message` ||
						(!args.length && !message.attachments.size)
					)
						return;

					message.content = this.substr(args.join(" ") || "no message content", 1500);
					await this.handleChannel(message, ticket);
				}
				break;
			default:
				break;
		}
	}

	private async handleDM(message: Message, ticket: iTicket): Promise<void> {
		try {
			const channel = await this.client.utils.getChannel(ticket.channelId);
			if (!channel) throw new Error(`Unable to find channel for ${ticket.caseId}`);

			const files = this.client.utils.getAttachments(message.attachments);
			await channel.send(
				`>>> 💬 | Reply from **${message.author.tag}** (${message.author.toString()}):\`\`\`\n${
					message.content
				}\n\`\`\`ℹ | Chatting within this ticket should not occur. This should occur in <#767016711164919809> or <#721360723351044149>`,
				{ files, allowedMentions: { users: [] } }
			);

			await message.react("✅").catch((e) => null);

			ticket.lastMsg = Date.now();
			await this.updateTicket({ caseId: ticket.caseId }, ticket);
		} catch (e) {
			this.close(ticket);
			this.client.log("ERROR", `HandleDM error: \`\`\`${e.stack || e.message}\`\`\``);
		}
	}

	private async handleChannel(message: Message, ticket: iTicket): Promise<void> {
		try {
			const user = await this.client.utils.fetchUser(ticket.userId);
			if (!user) throw new Error(`Unable to find user for ${ticket.caseId}`);

			const files = this.client.utils.getAttachments(message.attachments);
			await user.send(
				`>>> 💬 | Reply from **${
					message.member.nickname || message.author.username
				}** (${message.author.toString()}):\`\`\`\n${
					message.content
				}\n\`\`\`ℹ | Your ticket id is \`${ticket.caseId}\``,
				{ files, allowedMentions: { users: [] } }
			);

			await message.react("✅").catch((e) => null);

			ticket.lastMsg = Date.now();
			await this.updateTicket({ caseId: ticket.caseId }, ticket);
		} catch (e) {
			this.close(ticket);
			this.client.log("ERROR", `HandleChannel error: \`\`\`${e.stack || e.message}\`\`\``);
		}
	}

	public async close(ticket: iTicket, status: "inactive" | "closed" = "closed") {
		const channel = await this.client.utils.getChannel(ticket.channelId);
		if (channel && channel.type === "text") {
			const msg = await channel.send(
				`>>> ${this.client.mocks.emojis.loading} | Creating ticket transcript, please wait...`
			);

			const location = join(process.cwd(), "transcripts", `${ticket.caseId}.html`);
			const transcript = await new Transcript(this.client, { channel, id: ticket.caseId }).create(
				location
			);

			if (!transcript)
				msg.edit(
					`>>> ${this.client.mocks.emojis.redcross} | Something went wrong when saving the ticket transcript.\nThis channel will be deleted in **5 seconds**.`
				);
			else {
				const transcriptChannel = await this.client.utils.getChannel(
					this.client.mocks.departments.transcript
				);
				await transcriptChannel.send(
					new MessageEmbed()
						.setColor(this.client.hex)
						.setTitle(`Ticket: ${ticket.caseId}`)
						.attachFiles([new MessageAttachment(location, `${ticket.caseId}.html`)])
						.setDescription([
							`Ticket Owner: <@${ticket.userId}>`,
							`Ticket Claimer: <@${ticket.claimerId}>`,
							`[direct transcript](https://peppleton-transcript.marcusn.ml/${ticket.caseId})`,
						])
				);

				await msg.edit(
					`>>> ${this.client.mocks.emojis.greentick} | Successfully saved the ticket transcript.\nThis channel will be deleted in **5 seconds**.`
				);
			}
		}

		ticket.status = "closed";
		await this.updateTicket({ caseId: ticket.caseId }, ticket);

		const user = await this.client.utils.fetchUser(ticket.userId);
		if (user)
			await user
				.send(
					`>>> 🔒 | Your ticket (\`${ticket.caseId}\`) has been closed.\nReason: \`${
						status === "inactive"
							? "closed automatically for being inactive for 24 hours"
							: "Closed by the Staff Team"
					}\`.\n\n❓ | Need more support? Mention me to open a ticket!`
				)
				.catch((e) => null);

		setTimeout(async () => {
			await channel?.delete?.();
			await Ticket.findOneAndDelete({ caseId: ticket.caseId });
		}, 5e3);
	}

	public async transferUser(message: Message, member: GuildMember, ticket: iTicket) {
		try {
			message.channel = message.channel as TextChannel;

			await message.channel.updateOverwrite(member, {
				VIEW_CHANNEL: true,
				SEND_MESSAGES: true,
				ATTACH_FILES: true,
			});

			const claimer = await this.client.utils.fetchMember(ticket.claimerId, message.guild);
			if (
				!claimer.hasPermission("VIEW_AUDIT_LOG", { checkAdmin: true, checkOwner: true }) &&
				!this.client.isOwner(claimer)
			)
				await message.channel.updateOverwrite(claimer, {
					VIEW_CHANNEL: false,
				});

			ticket.claimerId = member.id;
			await this.updateTicket({ caseId: ticket.caseId }, ticket);

			await message.channel.send(
				`>>> 👋 | Hey ${member.toString()}, please check the **pins** for more information.`
			);

			const user = await this.client.utils.fetchUser(ticket.userId);
			await user.send(
				`>>> ${this.client.mocks.emojis.transfer} | Your ticket has been transferred to **${
					member.nickname || member.user.username
				}** (${member.toString()})`,
				{ allowedMentions: { users: [] } }
			);
		} catch (e) {
			this.close(ticket);
		}
	}

	public async getTicket(data: {
		status?: "open" | "closed" | "unclaimed";
		messageId?: string;
		claimerId?: string;
		lastMsg?: number;
		caseId?: string;
		channelId?: string;
		userId?: string;
	}): Promise<iTicket> {
		return (await Ticket.findOne(data))?.toObject?.();
	}

	public async saveTicket(data: {
		userId: string;
		messageId: string;
		caseId: string;
	}): Promise<iTicket> {
		return Ticket.create({ ...data, status: "unclaimed" });
	}

	public async updateTicket(
		query: {
			status?: "open" | "closed" | "unclaimed";
			messageId?: string;
			claimerId?: string;
			lastMsg?: number;
			caseId?: string;
			channelId?: string;
			userId?: string;
		},
		data: iTicket
	): Promise<iTicket> {
		return Ticket.findOneAndUpdate(query, data);
	}

	public async createTicket(
		message: Message,
		department: iDepartment
	): Promise<{ userId: string; messageId: string; caseId: string }> {
		const dm = await message.author.createDM();
		const emoji =
			this.client.emojis.cache.get(department.emojis.main)?.toString?.() ||
			department.emojis.fallback;

		const filter = (m: Message) => m.author.id === message.author.id;
		const base = (msg: string) =>
			`>>> ${emoji} | **Ticket Creation - ${department.name}**:\n${msg}\n\nSay \`cancel\` to cancel.`;

		// topic
		let msg = await dm.send(base("`1` - What is the topic of your question?"));
		const topic = (await this.client.utils.awaitMessages(msg, filter)).first();
		if (
			!topic ||
			(typeof topic.content === "string" && topic.content.toLowerCase().includes("cancel"))
		) {
			await msg.edit(
				`>>> ${emoji} | **Ticket Creation - ${department.name}**:\nTicket creation cancelled.`
			);
			return null;
		}

		// description
		msg = await dm.send(base("`2` - Please explain in full what question is."));
		const description = (await this.client.utils.awaitMessages(msg, filter)).first();
		if (
			!description ||
			(typeof description.content === "string" &&
				description.content.toLowerCase().includes("cancel"))
		) {
			await msg.edit(
				`>>> ${emoji} | **Ticket Creation - ${department.name}**:\nTicket creation cancelled.`
			);
			return null;
		}

		msg = await dm.send(base("`3` - Anything else you want to add to your ticket?"));
		const extra = (await this.client.utils.awaitMessages(msg, filter)).first();
		if (
			!extra ||
			(typeof extra.content === "string" && extra.content.toLowerCase().includes("cancel"))
		) {
			await msg.edit(
				`>>> ${emoji} | **Ticket Creation - ${department.name}**:\nTicket creation cancelled.`
			);
			return null;
		}

		msg = await dm.send(
			`>>> ${emoji} | **Ticket Creation - ${department.name}**:\n${this.client.mocks.emojis.loading} Creating a ticket, please wait...`
		);
		const channel = await this.client.utils.getChannel(department.guild.tickets);
		const attachments = [topic.attachments, description.attachments, extra.attachments]
			.map((x) => this.client.utils.getAttachments(x))
			.filter((x) => x.filter((x) => x))
			.reduce((a, b) => {
				a.push(...b);
				return a;
			});

		const caseId = await this.generateId();
		const m = await channel.send(
			new MessageEmbed()
				.setColor(this.client.hex)
				.setAuthor(
					`New ticket - ${caseId}`,
					message.author.displayAvatarURL({ dynamic: true, size: 4096 })
				)
				.setDescription(
					`Ticket for **${department.name}** created by **${
						message.author.tag
					}** (${message.author.toString()})\nReact with \`✅\` to claim this ticket!`
				)
				.addFields([
					{
						name: "• Topic",
						value: this.substr(topic.content || "no message content"),
						inline: true,
					},
					{
						name: "• Description",
						value: this.substr(description.content || "no message content"),
						inline: true,
					},
					{
						name: "• Extra",
						value: this.substr(extra.content || "no message content"),
						inline: true,
					},
				])
				.attachFiles(attachments)
		);

		await m
			.react("✅")
			.catch((e) =>
				this.client.log(
					"WARN",
					`ticketHandler#createTicket() warning: Unable to react with \`✅\` to message ${m.url}`
				)
			);
		await msg.edit(
			`>>> ${emoji} | **Ticket Creation - ${department.name}**:\nTicket registered under the \`${caseId}\` id. If you don't receive an answer within **24 hours**, please contact a **${this.client.mocks.emojis.supervisor} supervisor+**.`
		);

		return {
			messageId: m.id,
			userId: message.author.id,
			caseId,
		};
	}

	public async handleReactions(
		reaction: MessageReaction,
		user: User,
		department: iDepartment
	): Promise<any> {
		const ticket = await this.getTicket({ status: "unclaimed", messageId: reaction.message.id });
		if (!ticket || reaction.emoji.name !== "✅") return;

		try {
			const member = await this.client.utils.fetchMember(user.id, reaction.message.guild);
			if (!member)
				return this.client.log(
					"ERROR",
					`handleReactionsError: Unable to fetch guildMember (${user.id}/${user.tag})`
				);
			if (
				member.roles.cache.filter((r) => department.guild.roleIds.join("-").includes(r.id)).size < 0
			)
				return reaction.users.remove(user).catch((e) => null);

			ticket.claimerId = user.id;
			ticket.status = "open";
			ticket.messageId = "";
			await this.updateTicket({ caseId: ticket.caseId }, ticket);
			await reaction.message.delete().catch((e) => null);

			const obj: GuildCreateChannelOptions = {
				type: "text",
				permissionOverwrites: [
					{
						id: this.client.user.id,
						allow: [
							"ADD_REACTIONS",
							"SEND_MESSAGES",
							"ATTACH_FILES",
							"EMBED_LINKS",
							"MANAGE_CHANNELS",
							"VIEW_CHANNEL",
						],
					},
					{
						id: member.guild.id,
						deny: ["VIEW_CHANNEL"],
					},
					{
						id: member.id,
						allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "ATTACH_FILES"],
					},
				],
			};

			const roles = (
				await Promise.all(
					[...department.guild.roleIds, this.client.mocks.departments.manager].map(
						async (r) => await this.client.utils.getRole(r, member.guild)
					)
				)
			).filter((r) => r && r.permissions.has("VIEW_AUDIT_LOG"));
			const users = (
				await Promise.all(
					(this.client.ownerID as string[]).map(
						async (u) => await this.client.utils.fetchMember(u, member.guild)
					)
				)
			).filter((u) => u && user.id !== u.id && member.guild.ownerID !== u.id);

			(obj.permissionOverwrites as OverwriteResolvable[]).push(
				...[...roles, ...users].map(({ id }) => {
					return {
						id,
						allow: ["SEND_MESSAGES", "ATTACH_FILES", "VIEW_CHANNEL"] as PermissionString[],
					};
				})
			);

			const channel = (await reaction.message.guild.channels.create(
				ticket.caseId,
				obj
			)) as TextChannel;
			await channel
				.setParent(this.client.mocks.departments.category, { lockPermissions: false })
				.catch((e) => null);

			ticket.channelId = channel.id;
			ticket.lastMsg = Date.now();
			await this.updateTicket({ caseId: ticket.caseId }, ticket);

			const owner = await this.client.utils.fetchUser(ticket.claimerId);
			await owner.send(
				`>>> 🎫 | Your ticket (\`${ticket.caseId}\`) has been claimed by **${
					member.nickname || member.user.username
				}** (${member.toString()}), you should receive a respond shortly.`,
				{ allowedMentions: { users: [] } }
			);
			await channel
				.send("", {
					files: this.client.utils.getAttachments(reaction.message.attachments),
					embed: new MessageEmbed(reaction.message.embeds[0])
						.setFooter(`Ticket claimed by ${user.tag}`)
						.setDescription(
							reaction.message.embeds[0].description.replace(
								"React with `✅` to claim this ticket!",
								"\nChatting within this ticket should not occur. This should occur in <#767016711164919809> or <#721360723351044149>"
							)
						),
				})
				.then((m) => m.pin().catch((e) => null));
		} catch (e) {
			// this.close(ticket);
			this.client.log(
				"ERROR",
				`ticketHandler#handleReactions() error: \`\`\`${e.stack || e.message}\`\`\``
			);
		}
	}

	public async generateId(): Promise<string> {
		let id = nanoid(8).toLowerCase();
		while (id.includes("-") || (await this.getTicket({ caseId: `ticket-${id}` })))
			id = nanoid(8).toLowerCase();

		return `ticket-${id}`;
	}

	private substr(str: string, length: number = 1024): string {
		return str.length > length ? str.slice(0, length - 3) + "..." : str;
	}
}
