import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class messagesCommand extends Command {
	public constructor() {
		super("messages", {
			aliases: ["messages"],
			userPermissions: ["VIEW_AUDIT_LOG"],
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
		if (!["721360723351044149", "803013913150488617"].includes(message.channel.id))
			return message.util.send(
				`>>> ${this.client.mocks.emojis.redcross} | You can only use this command in <#803013913150488617> or <#721360723351044149>!`
			);

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
