import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class messagesCommand extends Command {
	public constructor() {
		super("messages", {
			aliases: ["messages"],
			userPermissions: ["VIEW_AUDIT_LOGS"],
			cooldown: 6e4,
			description: {
				content: "Shows the amount of messages the user sent within 7 days.",
				usage: "messages [user]",
			},
			args: [
				{
					id: "id",
					type: "string",
					default: (m: Message) => m.author.id,
				},
			],
		});
	}

	async exec(message: Message, { id }: { id: string }) {
		let user = await this.client.utils.fetchUser(id);
		if (!user) user = message.author;

		const data = this.client.activityManager.cache.get(user.id);
		if (!data)
			return message.util.send(`>>> ${this.client.mocks.emojis.redcross} | No data found.`);

		await message.util.send(
			`>>> ✉ | **${user.tag}** (${user.toString()}) sent a total of **${
				data.messages.length
			}** message(s) this week.`,
			{ allowedMentions: { users: [] } }
		);
	}
}
