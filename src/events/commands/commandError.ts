import { Message } from "discord.js";
import { Listener, Command } from "discord-akairo";

export default class errorEvent extends Listener {
	constructor() {
		super("error", {
			event: "error",
			emitter: "commandHandler",
		});
	}

	async exec(error: Error, message: Message, command?: Command) {
		this.client.log(
			"ERROR",
			`${command?.id || "unkown"} command error (${message.guild.id}): \`\`\`${
				error.stack || error.message
			}\`\`\``
		);

		await message.util
			.send(
				`>>> ❗ | **${command?.id || "Unkown"} - Command Error**\`\`\`xl\n${
					error.message
				}\n\`\`\`\nThis error is most likely on our side- please **screenshot** this error message, as well as your input, and send it to the developer team. If this error persists, please join our support server for help.`
			)
			.catch((e) => null);
	}
}
