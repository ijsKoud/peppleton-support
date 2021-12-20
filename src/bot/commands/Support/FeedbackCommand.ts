import { Command } from "../../../client/structures/Command";
import { ApplyOptions } from "@sapphire/decorators";
import { Message } from "discord.js";
import { Args } from "@sapphire/framework";

@ApplyOptions<Command.Options>({
	name: "feedback",
	description: "Changes the feedback message id",
	preconditions: ["ManagerOnly", "GuildOnly"],
	usage: "[id]",
})
export default class FeedbackCommand extends Command {
	public async messageRun(message: Message, args: Args) {
		const { client } = this.container;
		const { value: id } = await args.pickResult("string");

		await client.prisma.feedback.update({
			where: { guildId: message.guildId ?? "" },
			data: { messageId: id ?? "" },
		});
		return message.react("✅");
	}
}
