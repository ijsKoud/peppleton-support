import { Command } from "discord-akairo";
import { Message } from "discord.js";
import feedback from "../../models/feedback";

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
				},
			],
		});
	}

	async exec(message: Message, { messageID }: { messageID: string }) {
		if (!messageID) return this.client.emit("missingArg", message, ["messageID"]);
		await feedback.findByIdAndUpdate(
			{ guild: message.guild.id },
			{ guild: message.guild.id, message: messageID },
			{ upsert: true }
		);
		return message.react("✅");
	}
}
