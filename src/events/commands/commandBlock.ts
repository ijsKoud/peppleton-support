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
		switch (reason) {
			case "owner":
				message.util.send(`>>> ❗ | You are unable to use the **${command.id}** command in DMs!`);
				break;
			case "guild":
				message.util.send(
					`>>> ❗ | You are unable to use the **${command.id}** command because this command is only available to special people!`
				);
				break;
			default:
				message.util.send(
					`>>> ❗ | You are unable to use the **${command.id}** command. Reason: \`${reason}\`!`
				);
				break;
		}
	}
}
