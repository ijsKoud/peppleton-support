import {
	Collection,
	DMChannel,
	GuildChannelCreateOptions,
	Interaction,
	Message,
	MessageActionRow,
	MessageButton,
	OverwriteResolvable,
	TextChannel,
} from "discord.js";
import { nanoid } from "nanoid";
import Client from "../../Client";
import { iDepartment, iTicket } from "../../interfaces";
import Logger from "../../structures/Logger/Logger";

export default class TicketHandler {
	public logger: Logger;
	public tickets = new Collection<string, iTicket>();

	constructor(public client: Client) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		this.logger = client.loggers.get("support")!;
	}

	public async handleMessages(message: Message): Promise<void> {
		switch (message.channel.type) {
			case "DM":
				{
					let ticket =
						this.tickets.find(
							({ userId, status }) => userId === message.author.id && status === "open"
						) ?? null;

					if (!ticket) {
						ticket = await this.getTicket({ userId: message.author.id });
						if (!ticket) return;

						this.tickets.set(ticket.caseId, ticket);
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						setTimeout(() => this.tickets.delete(ticket!.caseId), 5e3);
					}

					if (
						(!message.content && !message.attachments.size) ||
						message.content.trim().startsWith(process.env.PREFIX as string)
					)
						return;
					message.content = this.substr(message.content || "no message content", 1500);
					await this.handleDM(message, ticket);
				}
				break;
			case "GUILD_TEXT":
				{
					let ticket = this.tickets.get(message.channel.name) ?? null;
					if (!ticket) {
						ticket = await this.getTicket({ userId: message.author.id });
						if (!ticket) return;

						this.tickets.set(ticket.caseId, ticket);
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						setTimeout(() => this.tickets.delete(ticket!.caseId), 5e3);
					}

					if (ticket.status !== "open" || ticket.claimerId !== message.author.id) return;
					const [cmd, ...args] = (message.content ?? "").trim().split(/ +/g);
					if (
						!cmd ||
						cmd.toLowerCase() !== `${process.env.PREFIX}message` ||
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
			const channel = await this.client.utils.getChannel(ticket.channelId ?? "");
			if (!channel || !channel.isText())
				throw new Error(`Unable to find correct channel for ${ticket.caseId}`);

			const files = this.client.utils.getAttachments(message.attachments);
			await channel.send({
				files,
				content: `>>> 💬 | Reply from **${
					message.author.tag
				}** (${message.author.toString()}):\n\n${
					message.content
				}\n\nℹ | Chatting within this ticket should not occur. This should occur in <#767016711164919809> or <#721360723351044149>`,
			});

			await message.react("✅").catch();

			ticket.lastMsg = Date.now();
			await this.updateTicket(ticket, ticket.caseId);
		} catch (e) {
			// this.close(ticket);
			this.logger.error(`HandleDM error: \`\`\`${e.stack || e.message}\`\`\``);
		}
	}

	private async handleChannel(message: Message, ticket: iTicket): Promise<void> {
		try {
			const user = await this.client.utils.fetchUser(ticket.userId);
			if (!user) throw new Error(`Unable to find user for ${ticket.caseId}`);

			const files = this.client.utils.getAttachments(message.attachments);
			await user.send({
				files,
				content: `>>> 💬 | Reply from **${
					message.member?.nickname || message.author.username
				}** (${message.author.toString()}):\n\n${message.content}\n\nℹ | Your ticket id is \`${
					ticket.caseId
				}\``,
			});

			await message.react("✅").catch();

			ticket.lastMsg = Date.now();
			await this.updateTicket(ticket, ticket.caseId);
		} catch (e) {
			// this.close(ticket);
			this.logger.error(`handleChannel error: \`\`\`${e.stack || e.message}\`\`\``);
		}
	}

	public async handleInteraction(interaction: Interaction) {
		if (!interaction.isButton()) return;
		if (!interaction.customId.startsWith("ticket-")) return;

		await interaction.deferUpdate().catch();

		const ticket = await this.getTicket({ caseId: interaction.customId });
		if (!ticket || ticket.status !== "unclaimed") {
			await interaction.deleteReply().catch();
			return;
		}

		if (!interaction.inGuild()) return;
		if (!interaction.guild)
			return this.logger.warn(
				"Received guild interaction without Guild property",
				interaction.toJSON()
			);

		const member = await this.client.utils.fetchMember(
			interaction.member.user.id,
			interaction.guild
		);
		if (!member)
			return this.logger.warn(
				"Received guild interaction without Member property",
				interaction.toJSON()
			);

		const department = this.client.constants.departments.tickets.find(
			(d) => d.name.toLowerCase() === ticket.department.toLowerCase()
		);
		if (!department)
			return this.logger.warn(
				"Received guild interaction without valid department property",
				JSON.stringify(ticket)
			);

		if (
			(!this.client.isOwner(member.id) || !member.permissions.has("ADMINISTRATOR", true)) &&
			!member.roles.cache.some((r) => department.guild.roleIds.includes(r.id))
		)
			return;

		await interaction.deleteReply().catch();

		ticket.status = "open";
		ticket.claimerId = member.id;

		// check if bot === test bot
		const options: GuildChannelCreateOptions =
			this.client.user?.id === "711468893457088553"
				? {
						type: "GUILD_TEXT",
						permissionOverwrites: [
							{
								// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
								id: this.client.user!.id,
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
				  }
				: {
						type: "GUILD_TEXT",
						parent: this.client.constants.departments.category,
						permissionOverwrites: [
							{
								// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
								id: this.client.user!.id,
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
							{
								id: this.client.constants.departments.manager,
								allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "ATTACH_FILES"],
							},
							...this.client.owners.map<OverwriteResolvable>((str) => ({
								id: str,
								allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "ATTACH_FILES"],
							})),
						],
				  };

		const channel = (await interaction.guild.channels.create(
			ticket.caseId,
			options
		)) as TextChannel;
		ticket.channelId = channel.id;
		ticket.lastMsg = Date.now();

		await this.updateTicket(ticket as iTicket, ticket.caseId);

		const owner = await this.client.utils.fetchUser(ticket.userId);
		if (!owner) return;

		await owner.send(
			`>>> 🎫 | Your ticket (\`${ticket.caseId}\`) has been claimed by **${
				member.nickname || member.user.username
			}** (${member.toString()}), you should receive a respond shortly.`
		);

		const rawEmbed = interaction.message.embeds[0];
		const embeds = this.client.utils.createEmbed({
			title: rawEmbed.title ?? undefined,
			description: rawEmbed.description?.replace(
				"Press the button to claim!",
				"Chatting within this ticket should not occur. This should occur in <#767016711164919809> or <#721360723351044149>"
			),
			author: {
				name: rawEmbed.author?.name,
				iconURL: rawEmbed.author?.url,
			},
			fields: rawEmbed.fields,
			footer: {
				text: `Ticket claimed by ${member.user.tag}`,
			},
		});

		await channel
			.send({
				files: Array.isArray(interaction.message.attachments)
					? interaction.message.attachments.map((a) => a.url)
					: this.client.utils.getAttachments(interaction.message.attachments),
				embeds,
			})
			.then((m) => m.pin().catch());
	}

	public async getTicket(data: Partial<iTicket>) {
		try {
			const ticket = await this.client.prisma.ticket.findFirst({ where: data });
			if (ticket)
				this.logger.debug(`Successfully fetched ticket for with caseId: ${ticket.caseId}`);
			return ticket as iTicket;
		} catch (e) {
			this.logger.fatal(e);
			return null;
		}
	}

	public async updateTicket(data: Partial<iTicket>, id: string) {
		try {
			await this.client.prisma.ticket.update({ where: { caseId: id }, data });
			this.logger.debug(`Successfully updated ticket for with caseId: ${id}`);
		} catch (e) {
			this.logger.fatal(e);
		}
	}

	public async saveTicket({
		userId,
		caseId,
		department,
	}: {
		userId: string;
		caseId: string;
		department: string;
	}) {
		try {
			await this.client.prisma.ticket.create({ data: { caseId, userId, department } });
			this.logger.debug(`Successfully saved ticket for ${userId} with caseId: ${caseId}`);
		} catch (e) {
			this.logger.fatal(e);
		}
	}

	public async createTicket(
		message: Message,
		dm: DMChannel,
		department: iDepartment
	): Promise<{ userId: string; caseId: string } | null> {
		const emoji =
			this.client.emojis.cache.get(department.emojis.main)?.toString?.() ||
			department.emojis.fallback;

		const filter = (m: Message) => m.author.id === message.author.id;
		const base = (msg: string) =>
			`>>> ${emoji} | **Ticket Creation - ${department.name}**:\n${msg}\n\nSay \`cancel\` to cancel.`;

		// topic
		let msg = await dm.send(base("`1` - What is the topic of your question?"));
		const topic = (await this.client.utils.awaitMessages(msg, { filter })).first();
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
		const description = (await this.client.utils.awaitMessages(msg, { filter })).first();
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

		// extra
		msg = await dm.send(base("`3` - Anything else you want to add to your ticket?"));
		const extra = (await this.client.utils.awaitMessages(msg, { filter })).first();
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
			`>>> ${emoji} | **Ticket Creation - ${department.name}**:\n${this.client.constants.emojis.loading} Creating a ticket, please wait...`
		);
		const channel = await this.client.utils.getChannel(department.guild.tickets);
		const caseId = await this.generateId();

		const components = [
			new MessageActionRow().addComponents(
				new MessageButton().setStyle("SUCCESS").setEmoji("✔").setCustomId(caseId)
			),
		];
		const attachments = [topic.attachments, description.attachments, extra.attachments]
			.map((x) => this.client.utils.getAttachments(x))
			.filter((x) => x.filter((y) => y))
			.reduce((a, b) => {
				a.push(...b);
				return a;
			});

		const embeds = this.client.utils.createEmbed({
			author: {
				name: `New ticket - ${caseId}`,
				iconURL: message.author.displayAvatarURL({ dynamic: true, size: 4096 }),
			},
			description: `Ticket for **${department.name}** created by **${
				message.author.tag
			}** (${message.author.toString()})\nPress the button to claim!`,
			fields: [
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
			],
		});

		if (!channel || !channel.isText()) return null;
		await channel.send({ embeds, files: attachments, components });

		await msg.edit(
			`>>> ${emoji} | **Ticket Creation - ${department.name}**:\nTicket registered under the \`${caseId}\` id. If you don't receive an answer within **24 hours**, please contact a **${this.client.constants.emojis.supervisor} supervisor+**.`
		);

		return {
			userId: message.author.id,
			caseId,
		};
	}

	public async generateId(): Promise<string> {
		let id = nanoid(8).toLowerCase();
		const tickets = await this.client.prisma.ticket.findMany();

		while (id.includes("-") || tickets.find((t) => t.caseId === `ticket-${id}`))
			id = nanoid(8).toLowerCase();

		return `ticket-${id}`;
	}

	private substr(str: string, length = 1024): string {
		return str.length > length ? str.slice(0, length - 3) + "..." : str;
	}
}
