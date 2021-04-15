import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class reportCommand extends Command {
	constructor() {
		super("report", {
			aliases: ["report"],
			userPermissions: ["VIEW_AUDIT_LOG"],
			clientPermissions: ["MANAGE_CHANNELS"],
			description: {
				content: "Accept/decline a report",
				usage: "report <caseId> <accept/decline> [reason (only if declined)]",
			},
			args: [
				{
					id: "caseId",
					type: "lowercase",
				},
				{
					id: "accepted",
					type: (_: Message, str: string) =>
						typeof str === "string" && ["accept", "decline"].includes(str.toLowerCase())
							? str.toLowerCase() === "accept"
								? true
								: false
							: null,
				},
				{
					id: "reason",
					type: "string",
					match: "rest",
				},
			],
			channel: "guild",
			ownerOnly: true,
		});
	}

	async exec(
		message: Message,
		{ caseId, accepted, reason }: { caseId: string; accepted: boolean; reason?: string }
	) {
		const report = await this.client.supportHandler.reportHandler.getReport({
			caseId,
		});

		if (!report)
			return message.util.send(
				`>>> ${this.client.mocks.emojis.redcross} | I was unable to find a report with the \`${caseId}\` id.`
			);
		if (typeof accepted !== "boolean")
			return message.util.send(
				`>>> ${this.client.mocks.emojis.redcross} | The second argument must be "accept" or "decline".`
			);

		await this.client.supportHandler.reportHandler.handleUpdate(
			message,
			report,
			accepted ? null : reason
		);
	}
}
