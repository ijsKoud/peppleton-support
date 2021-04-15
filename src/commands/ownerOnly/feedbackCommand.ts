import { Command } from "discord-akairo";
import { Message } from "discord.js";
import feedback from "../../models/support/Feedback";

export default class feedbackCommand extends Command {
	constructor() {
		super("feedback", {
			aliases: ["feedback"],
			category: "ownerOnly",
			userPermissions: ["MANAGE_GUILD"],
			channel: "guild",
			args: [
				{
					id: "messageID",
					type: "string",
					match: "phrase",
					default: "",
				},
			],
		});
	}

	async exec(message: Message, { messageID }: { messageID: string }) {
		await feedback.findOneAndUpdate(
			{ guildId: message.guild.id },
			{ guildId: message.guild.id, messageId: messageID || "messageId" },
			{ upsert: true }
		);
		return message.react("✅");
	}
}
