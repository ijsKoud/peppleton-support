import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class closeCommand extends Command {
	constructor() {
		super("close", {
			aliases: ["close"],
			channel: "guild",
			args: [
				{
					id: "id",
					type: "string",
				},
			],
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
