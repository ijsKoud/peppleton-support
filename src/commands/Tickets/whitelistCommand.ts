import { Message } from "discord.js";
import { Command } from "discord-akairo";
import Blacklist from "../../models/tickets/Blacklist";

export default class whitelistCommand extends Command {
	constructor() {
		super("whitelist", {
			aliases: ["whitelist"],
			channel: "guild",
			userPermissions: ["MANAGE_MESSAGES"],
			cooldown: 1e3,
			description: {
				content: "whitelist someone",
				usage: "whitelist <user>",
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
		if (!(await Blacklist.findOne({ guildId: message.guild.id, userId: user.id })))
			return message.util.send(">>> ❗ | User already whitelisted.");

		await Blacklist.findOneAndDelete({ guildId: message.guild.id, userId: user.id });
		message.util.send(
			`>>> ${this.client.utils.emojiFinder("greentick")} | Successfully whitelisted **${
				user.tag
			}**!`
		);
	}
}
