import { Command } from "discord-akairo";
import {
	Message,
	GuildCreateChannelOptions,
	PermissionString,
	OverwriteResolvable,
	TextChannel,
} from "discord.js";
import Ticket from "../../models/support/Ticket";

export default class contactCommand extends Command {
	constructor() {
		super("contact", {
			aliases: ["contact"],
			userPermissions: ["VIEW_AUDIT_LOG"],
			description: {
				content: "Contact a user using the tickets system",
				usage: "tickets",
			},
			ratelimit: 1,
			cooldown: 3e3,
			channel: "guild",
			args: [
				{
					id: "userId",
					type: "string",
				},
				{
					id: "reason",
					match: "rest",
				},
			],
		});
	}

	async exec(message: Message, { userId, reason }: { userId: string; reason: string }) {
		if (!message.guild) return;
		const user = await this.client.utils.fetchMember(userId, message.guild);

		if (!user)
			return message.util.send(
				`>>> ${this.client.mocks.emojis.redcross} | Unkown user, please check if you copied the right ID or if you spelled their name correctly.`
			);
		if (!reason)
			return message.util.send(
				`>>> ${this.client.mocks.emojis.redcross} | No reason specified. Please provide a reason why you want to contact this user.`
			);

		const data = await this.client.supportHandler.ticketHandler.getTicket({
			userId: message.author.id,
		});
		if (data)
			return message.author.send(`>>> 🎫 | This user already created a ticket (${data.caseId}).`);

		const id = await this.client.supportHandler.ticketHandler.generateId();

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
					id: message.guild.id,
					deny: ["VIEW_CHANNEL"],
				},
				{
					id: message.author.id,
					allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "ATTACH_FILES"],
				},
			],
		};

		const role = await this.client.utils.getRole(
			this.client.mocks.departments.manager || null,
			message.guild
		);
		const users = (
			await Promise.all(
				(this.client.ownerID as string[]).map(
					async (u) => await this.client.utils.fetchMember(u, message.guild)
				)
			)
		).filter((u) => u && user.id !== u.id && message.guild.ownerID !== u.id);

		(obj.permissionOverwrites as OverwriteResolvable[]).push(
			...[role, ...users]
				.filter((x) => x)
				.map(({ id }) => {
					return {
						id,
						allow: ["SEND_MESSAGES", "ATTACH_FILES", "VIEW_CHANNEL"] as PermissionString[],
					};
				})
		);

		const channel = (await message.guild.channels.create(id, obj)) as TextChannel;
		await channel
			.setParent(this.client.mocks.departments.category, { lockPermissions: false })
			.catch((e) => null);

		await Ticket.create({
			caseId: id,
			channelId: channel.id,
			claimerId: message.author.id,
			userId: user.id,
			status: "open",
			lastMsg: Date.now(),
		});

		channel.send(
			`>>> 🎫 | Ticket created by **${
				message.member.nickname || message.author.username
			}** (${message.author.toString()})\nUser contacted: **${
				user.user.tag
			}** (${user.toString()})\nReason: ${reason}`,
			{ split: true, allowedMentions: { users: [message.author.id] } }
		);
		try {
			await user.send(
				`>>> 🎫 | **${
					message.member.nickname || message.author.username
				}** (${message.author.toString()}) contacted you via the contact command (ticket id: \`${id}\`).\nReason: ${reason}`,
				{ split: true, allowedMentions: { users: [] } }
			);
		} catch (e) {
			await message.util.send("unable to DM this user.");
		}

		await message.react("✅");
	}
}
