import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class ticketCommand extends Command {
	constructor() {
		super("ticket", {
			aliases: ["ticket"],
			category: "tickets",
			description: {
				content: "Turns tickets on or off",
				usage: "tickets",
			},
			ratelimit: 1,
			cooldown: 3e3,
			channel: "guild",
			userPermissions: ["MANAGE_GUILD"],
		});
	}

	async exec(message: Message) {
		this.client.tickets = !this.client.tickets;
		return message.util.send(
			`> ✅ | Tickets are now turned \`${this.client.tickets ? "on" : "off"}\`!`
		);
	}
}
