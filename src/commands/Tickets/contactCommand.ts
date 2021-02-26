import { Command } from "discord-akairo";
import { Message, User } from "discord.js";
import { nanoid } from "nanoid";
import { accessRoles, categoryId } from "../../mocks/departments";
import Ticket from "../../models/tickets/Ticket";

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
				`> 🔎 | Unkown user, please check if you copied the right ID or if you spelled their name correctly.`
			);
		if (!reason)
			return message.util.send(
				"> ❌ | No reason specified. Please provide a reason why you want to contact this user."
			);

		if (await Ticket.findOne({ userId: user.id }))
			return message.util.send(">>> 🎫 | User already opened a ticket.");

		try {
			let id = `[ticket-${nanoid(8)}]`;
			while (await this.client.utils.checkId(id)) {
				id = `[ticket-${nanoid(8)}]`;
			}

			const channel = await message.guild.channels.create(id.slice(1, -1), {
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
						id: user.id,
						allow: ["SEND_MESSAGES", "ATTACH_FILES", "VIEW_CHANNEL"],
					},
					{
						id: message.guild.id,
						deny: ["VIEW_CHANNEL"],
					},
				],
			});

			accessRoles.forEach(
				async (r) =>
					await channel
						.updateOverwrite(r, { VIEW_CHANNEL: true, SEND_MESSAGES: true, ATTACH_FILES: true })
						.catch((e) => null)
			);
			await channel.setParent(categoryId).catch((e) => null);

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
					message.author.tag
				}** (${message.author.toString()})\nUser contacted: **${
					user.user.tag
				}** (${user.toString()})\nReason: ${reason}`,
				{ split: true, allowedMentions: { users: [message.author.id] } }
			);
			try {
				await user.send(
					`>>> 🎫 | **${
						message.author.tag
					}** (${message.author.toString()}) opened a new ticket (\`${id}\`) for you using the contact command.\nReason: ${reason}`,
					{ split: true, allowedMentions: { users: [] } }
				);
			} catch (e) {
				message.util.send("unable to DM this user.");
			}
		} catch (e) {
			this.client.log("ERROR", `Contact command error: \`\`\`${e}\`\`\``);
			message.util.send(">>> ⚠ | An unexpected error occurred, please try again later!");
		}

		message.react("✅");
	}
}
