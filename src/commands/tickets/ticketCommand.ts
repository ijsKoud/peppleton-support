import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class ticketCommand extends Command {
	constructor() {
		super("ticket", {
			aliases: ["ticket"],
			description: {
				content: "Turns tickets on or off",
				usage: "tickets",
			},
			ratelimit: 1,
			cooldown: 3e3,
			channel: "guild",
		});
	}

	async exec(message: Message) {
		if (
			!message.member ||
			(!message.member.hasPermission("MANAGE_GUILD") && message.author.id !== "304986851310043136")
		)
			return message.react("❌");
		this.client.tickets = !this.client.tickets;
		return message.channel.send(
			`> ✅ | Tickets are now turned \`${this.client.tickets ? "on" : "off"}\`!`
		);
	}
}
