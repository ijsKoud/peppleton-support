import { Command } from "discord-akairo";
import { Message, GuildMember } from "discord.js";
import blacklist from "../../models/blacklist";

export default class unblacklistCommand extends Command {
	constructor() {
		super("unblacklist", {
			aliases: ["unblacklist"],
			category: "tickets",
			description: {
				content: "unblacklist someone, add the permission to create tickets.",
				usage: "unblacklist <user> <reason>",
			},
			ratelimit: 1,
			cooldown: 3e3,
			channel: "guild",
			userPermissions: ["MANAGE_MESSAGES"],
			args: [
				{
					id: "user",
					type: "member",
				},
				{
					id: "reason",
					type: "string",
					match: "rest",
				},
			],
		});
	}

	async exec(message: Message, { user, reason }: { user: GuildMember; reason: string }) {
		if (!user || !reason) return this.client.emit("missingArg", message, ["user", "reason"]);

		(await blacklist.findOne({ id: user.id })).delete();

		if (user.roles.highest.position >= message.member.roles.highest.position)
			return message.react("❌");

		message.react("✅");
	}
}
