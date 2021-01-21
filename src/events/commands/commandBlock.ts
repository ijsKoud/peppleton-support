import { Listener, Command } from "discord-akairo";
import { Message } from "discord.js";

export default class CommandBlockedListener extends Listener {
	constructor() {
		super("commandBlocked", {
			emitter: "commandHandler",
			event: "commandBlocked",
		});
	}

	exec(message: Message, command: Command, reason: string) {
		message.channel.send(
			`>>> ❗ | You are unable to use the **${command.id}** command because of \`${reason}\`!`
		);
	}
}
