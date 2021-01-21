import { Command } from "discord-akairo";
import { Message, User } from "discord.js";
import { categoryId, mRole, svRole } from "../../client/config";
import ticket from "../../models/ticket";

export default class contactCommand extends Command {
	constructor() {
		super("contact", {
			aliases: ["contact"],
			description: {
				content: "Contact a user using the tickets system",
				usage: "tickets",
			},
			ratelimit: 1,
			cooldown: 3e3,
			channel: "guild",
			args: [
				{
					id: "user",
					description: "the user you want to contact",
					match: "phrase",
					type: "user",
				},
				{
					id: "reason",
					description: "the reason why you want to contact him",
					match: "rest",
				},
			],
		});
	}

	async exec(message: Message, { user, reason }: { user: User; reason: string }) {
		if (!message.guild) return;

		if (!user)
			return message.channel.send(
				`> 🔎 | Unkown user, please check if you copied the right ID or if you spelled their name correctly.`
			);
		if (!reason)
			return message.channel.send(
				"> ❌ | No reason specified. Please provide a reason why you want to contact this user."
			);

		if (await ticket.findOne({ userId: user.id })) return message.react("❌");

		const roles = message.member.roles.cache;
		let boolean: boolean = false;

		["742791627495571596", "742790053998362768"].forEach(
			(r) => (boolean = !boolean ? (roles.has(r) ? true : false) : boolean)
		);

		if (!boolean && message.author.id !== "304986851310043136") return message.react("❌");

		try {
			user.send(
				`> 🎫 | A new ticket is created by **${
					message.member.nickname || message.author.username
				}**. The reason to contact you is: **${reason
					.replace(/\`/g, "")
					.replace(/\*/g, "")}** \n > ❓ | Send a message to respond to this ticket.`
			);

			const ticketChannel = await message.guild.channels.create(`${user.id}-ticket`, {
				type: "text",
				topic: `${message.author.id}| Do not edit this channel. If you edit it you might break the system!`,
				parent: categoryId,
			});

			await ticketChannel.updateOverwrite(message.guild.id, {
				SEND_MESSAGES: false,
				VIEW_CHANNEL: false,
			});
			await ticketChannel.updateOverwrite(message.author, {
				SEND_MESSAGES: true,
				VIEW_CHANNEL: true,
			});
			ticketChannel.updateOverwrite(svRole, {
				SEND_MESSAGES: false,
				VIEW_CHANNEL: false,
			});
			ticketChannel.updateOverwrite(mRole, {
				SEND_MESSAGES: true,
				VIEW_CHANNEL: true,
			});
			ticketChannel.updateOverwrite(message.guild.me, {
				SEND_MESSAGES: true,
				VIEW_CHANNEL: true,
				ATTACH_FILES: true,
			});
			await ticketChannel.updateOverwrite("304986851310043136", {
				SEND_MESSAGES: true,
				VIEW_CHANNEL: true,
				ATTACH_FILES: true,
			});

			ticketChannel.send(
				`> ℹ | This ticket was opened by ${message.author.toString()} for ${user.toString()} about **${reason
					.replace(/\`/g, "")
					.replace(/\*/g, "")}**.`
			);

			ticket.create({ userId: user.id, channelId: ticketChannel.id, lastMessage: Date.now() });
			return message.react("✅");
		} catch (e) {
			return message.channel.deleted
				? ""
				: message.channel.send(
						`> ❗ | Oh no, this shouldn't happen: \n\`\`\`\n${e}\n\`\`\`\n This is 9/10 times because the user closed their DMs.`
				  );
		}
	}
}
