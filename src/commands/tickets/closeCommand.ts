import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class closeCommand extends Command {
	public constructor() {
		super("close", {
			aliases: ["close"],
			category: "tickets",
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

		let allowed: boolean = false;
		if (message.channel.topic.includes(message.author.id)) allowed = true;
		else if (this.client.isOwner(message.author)) allowed = true;
		else if (message.member.hasPermission("VIEW_AUDIT_LOG", { checkAdmin: true, checkOwner: true }))
			allowed = true;

		if (!allowed) return message.react("❌");

		message.util.send(`>>> 🗑 | Deleting the channel in **5 seconds**...`);
		setTimeout(() => message.channel.delete("closed by claimer"), 5e3);
	}
}
