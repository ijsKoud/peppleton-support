import { Command } from "discord-akairo";
import { Message } from "discord.js";
import Ticket from "../../models/tickets/Ticket";

export default class deleteCommand extends Command {
	constructor() {
		super("delete", {
			aliases: ["delete"],
			args: [
				{
					id: "id",
					type: "string",
					match: "rest",
				},
			],
			ownerOnly: true,
		});
	}

	async exec(message: Message, { id }: { id: string }) {
		const ticket = await Ticket.findOne({ caseId: id });
		if (!ticket) return message.util.send(">>> 🎫 | No ticket configuration found.");

		let found: boolean = true;
		try {
			const channel = await this.client.utils.getChannel(ticket.channelId);
			if (!channel) found = false;
			else channel.delete();

			await ticket.deleteOne();
		} catch (e) {
			this.client.log("ERROR", `Delete command error: \`\`\`${e}\`\`\``);
			return message.util.send(">>> ⚠ | An unexpected error occurred, please try again later.");
		}

		this.client.log("INFO", `Ticket deleted: \`${id}\``);
		message.util.send(
			`>>> 🎫 | Ticket successfully deleted, ${
				found ? "ticket channel deleted" : "channel not found"
			}.`
		);
	}
}
