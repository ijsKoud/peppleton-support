import { Message } from "discord.js";
import { Command } from "discord-akairo";
import Blacklist from "../../models/tickets/Blacklist";

export default class blacklistCommand extends Command {
	constructor() {
		super("blacklist", {
			aliases: ["blacklist"],
			channel: "guild",
			userPermissions: ["MANAGE_MESSAGES"],
			cooldown: 1e3,
			description: {
				content: "Blacklist someone",
				usage: "blacklist <user>",
			},
			args: [
				{
					id: "id",
					type: "string",
					match: "rest",
					default: "",
				},
			],
		});
	}

	async exec(message: Message, { id }: { id: string }) {
		const user = await this.client.utils.fetchUser(id);
		if (!user) return message.util.send(">>> 🔎 | No user found.");
		if (await Blacklist.findOne({ guildId: message.guild.id, userId: user.id }))
			return message.util.send(">>> ❗ | User already blacklisted.");

		await Blacklist.create({ guildId: message.guild.id, userId: user.id });
		message.util.send(`>>> 🔨 | Successfully blacklisted **${user.tag}**!`);
	}
}
