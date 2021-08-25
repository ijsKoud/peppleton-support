import { Command } from "../../../client/structures/Command";
import { ApplyOptions } from "@sapphire/decorators";
import { Message } from "discord.js";
import { Args } from "@sapphire/framework";

@ApplyOptions<Command.Options>({
	name: "whitelist",
	aliases: ["whitelist"],
	description: "whitelist a user",
	preconditions: ["ManagerOnly", "GuildOnly"],
	usage: "<user> <ticket/suggestion/report>",
})
export default class ReportCommand extends Command {
	public async run(message: Message, args: Args) {
		const { client } = this.container;
		const { value: user } = await args.pickResult("user");
		const { value: type } = await args.pickResult("string");
		if (!user)
			return message.reply(`>>> ${client.constants.emojis.error} | Invalid user provided.`);
		if (!["ticket", "report", "suggestion"].includes(type ?? ""))
			return message.reply(
				`>>> ${client.constants.emojis.redcross} | Invalid type provided, type must be \`ticket\`, \`report\` or \`suggestion\`.`
			);

		await client.supportHandler.whitelist(
			message,
			user,
			type as "ticket" | "report" | "suggestion"
		);
	}
}
