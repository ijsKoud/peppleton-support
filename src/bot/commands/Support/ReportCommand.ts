import { Command } from "../../../client/structures/Command";
import { ApplyOptions } from "@sapphire/decorators";
import { Collection, Message } from "discord.js";
import { Args } from "@sapphire/framework";

@ApplyOptions<Command.Options>({
	name: "report",
	aliases: ["report"],
	description: "Report command without prompt",
	preconditions: ["ManagerOnly", "GuildOnly"],
	usage: '<department> <username> <reason in ""> <extra in "">',
})
export default class ReportCommand extends Command {
	public async run(message: Message, args: Args) {
		const { client } = this.container;
		const { value: dep } = await args.pickResult("string");
		const { value: username } = await args.pickResult("string");
		const { value: reason } = await args.pickResult("string");
		const { value: extra } = await args.restResult("string");

		if (!dep || !username || !reason || !extra)
			return message.reply(
				`>>> ${client.constants.emojis.redcross} | Invalid data provided.\nRequired: <department> <username> <reason in ""> <extra in "">`
			);

		const department = client.constants.departments.tickets.find(
			(d) => d.name.toLowerCase() === dep.toLowerCase()
		);
		if (!department)
			return message.reply(
				`>>> ${
					client.constants.emojis.redcross
				} | Invalid department provided.\nDepartments:\n${client.constants.departments.tickets
					.map((d) => d.name)
					.join("\n")}`
			);

		const report = await client.supportHandler.reportHandler._createReport(
			department,
			// @ts-ignore
			{ ...message, content: username },
			{ content: reason, attachments: new Collection() },
			{ content: extra, attachments: new Collection() }
		);

		if (!report) return;
		await client.supportHandler.reportHandler.saveReport({
			userId: message.author.id,
			messageId: report.message.id,
			caseId: report.caseId,
			channelId: report.channel.id,
		});

		await message.reply(
			`>>> ${client.constants.emojis.greentick} | **Report Creation - ${department.name}**:\nReport registered under the \`${report?.caseId}\` id.\nYou will receive a DM when a **${client.constants.emojis.manager} manager+** handled your report.`
		);
	}
}
