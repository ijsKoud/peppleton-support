import { Command } from "discord-akairo";
import { Message, GuildMember } from "discord.js";
import blacklist from "../../models/blacklist";
import ms from "ms";

export default class blacklistCommand extends Command {
	constructor() {
		super("blacklist", {
			aliases: ["blacklist"],
			description: {
				content: "Blacklist someone, remove the permission to create tickets.",
				usage: "blacklist <user> <duration> <reason>",
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
					id: "duration",
					type: "string",
				},
				{
					id: "reason",
					type: "string",
					match: "rest",
				},
			],
		});
	}

	async exec(
		message: Message,
		{ user, duration, reason }: { user: GuildMember; duration: string; reason: string }
	) {
		if (!user || !duration || !reason)
			return this.client.emit("missingArg", message, ["user", "duration", "reason"]);

		const time = ms(duration);
		const endDate = Date.now() + time;
		const b = await blacklist.create({ id: user.id, endDate });

		if (user.roles.highest.position >= message.member.roles.highest.position)
			return message.react("❌");
		try {
			user.send(
				`>>> 🔨 | **Blacklist received**\n⌚ | **Duration**: \`${ms(time, {
					long: false,
				})}\`\n📋 | **Reason**: ${reason}`
			);
		} catch (e) {}
		setTimeout(() => b.delete(), time);

		message.react("✅");
	}
}
