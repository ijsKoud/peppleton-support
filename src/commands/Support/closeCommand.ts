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

		await this.client.supportHandler.ticketHandler.close(ticket);
	}
}
