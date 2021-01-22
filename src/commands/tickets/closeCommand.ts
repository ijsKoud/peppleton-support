import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class closeCommand extends Command {
	public constructor() {
		super("close", {
			aliases: ["close"],
			category: "Tickets",
			description: {
				content: "Closes a ticket, admins can force close a ticket.",
				usage: "close",
			},
			ratelimit: 1,
			cooldown: 1e3,
			channel: "guild",
		});
	}

	public exec(message: Message) {
		if (message.channel.type !== "text" || !message.channel.name.endsWith("-ticket")) return;
		if (
			!this.client.isOwner(message.author) &&
			(!message.member.hasPermission("VIEW_AUDIT_LOG", { checkAdmin: true, checkOwner: true }) ||
				!message.channel.topic.includes(message.author.id))
		)
			return message.react("❌");

		message.channel.send(`>>> 🗑 | Deleting the channel in **5 seconds**...`);
		setTimeout(() => message.channel.delete("closed by claimer"), 5e3);
	}
}
