import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class closeCommand extends Command {
	constructor() {
		super("close", {
			aliases: ["close"],
			userPermissions: ["MANAGE_MESSAGES"],
			clientPermissions: ["MANAGE_CHANNELS"],
			description: {
				content: "close a ticket",
				usage: "close",
			},
			channel: "guild",
			ownerOnly: true,
		});
	}

	async exec(message: Message) {
		if (message.channel.type !== "text" || !message.channel.name.startsWith("ticket-")) return;
		const ticket = await this.client.supportHandler.ticketHandler.getTicket({
			channelId: message.channel.id,
		});
		if (!ticket) return;

		if (
			ticket.claimerId !== message.author.id &&
			!message.member.hasPermission("VIEW_AUDIT_LOG", { checkAdmin: true, checkOwner: true }) &&
			!this.client.isOwner(message.author)
		)
			return message.util.send(
				`>>> ${this.client.mocks.emojis.redcross} | Sorry, only ticket claimers, Bot developers and Managers+ are able to use this command in tickets.`
			);

		await this.client.supportHandler.ticketHandler.close(ticket);
	}
}
