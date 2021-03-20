import { Command, Listener } from "discord-akairo";
import { Message } from "discord.js";

export default class reload extends Command {
	constructor() {
		super("reload", {
			aliases: ["reload"],
			description: {
				content: "Reload an event or command",
				usage: "reload <command/event>",
			},
			args: [
				{
					id: "file",
					type: "commandAlias",
				},
			],
			ownerOnly: true,
		});
	}

	async exec(message: Message, { file }: { file: Command | Listener }) {
		if (!file)
			return message.util.send(
				`>>> ${this.client.utils.emojiFinder("terminalicon")} | No command found.`
			);
		file.reload();
		this.client.log("INFO", `**${file.id}** command/event reloaded!`);
		return message.util.send(
			`>>> ${this.client.utils.emojiFinder("terminalicon")} | **${
				file.id
			}** command/event reloaded!`
		);
	}
}
