import { Command } from "../../../client/structures/Command";
import { ApplyOptions } from "@sapphire/decorators";
import { Message } from "discord.js";
import { Args } from "@sapphire/framework";

@ApplyOptions<Command.Options>({
	name: "aceept",
	aliases: ["accept", "acceptreport"],
	description: "Accept/decline a report",
	preconditions: ["ManagerOnly"],
	usage: "<caseId> <accept/decline> [reason (only if declined)]",
})
export default class AcceptCommand extends Command {
	public async run(message: Message, args: Args) {
		const { client } = this.container;
		const { value: caseId } = await args.pickResult("string");
		const { value: accepted } = await args.pickResult("string");
		const { value: reason } = await args.restResult("string");

		if (!caseId || !caseId.startsWith("report-"))
			return message.reply(`>>> ${client.constants.emojis.redcross} | Invalid caseId provided.`);

		const report = await client.supportHandler.reportHandler.getReport(caseId);

		if (!report)
			return message.reply(
				`>>> ${client.constants.emojis.redcross} | I was unable to find a report with the \`${caseId}\` id.`
			);
		if (!["accept", "decline"].includes(accepted ?? ""))
			return message.reply(
				`>>> ${client.constants.emojis.redcross} | The second argument must be "accept" or "decline".`
			);

		await client.supportHandler.reportHandler.handleUpdate(
			message,
			report,
			accepted === "accept" ? null : reason
		);
	}
}
