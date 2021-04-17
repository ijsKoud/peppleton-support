import { Command } from "discord-akairo";
import { Message } from "discord.js";
import { exec } from "child_process";

export default class updateCommand extends Command {
	constructor() {
		super("update", {
			aliases: ["update"],
			ownerOnly: true,
		});
	}

	async exec(message: Message) {
		const str = ({ pull, tsc }: { pull: boolean; tsc: boolean }) =>
			`>>> 🤖 | **Update Command**:\n${[
				`Fetched data: ${pull ? "`✅`" : "`❌`"}`,
				`Compiled: ${tsc ? "`✅`" : "`❌`"}`,
			].join("\n")}`;

		const msg = await message.channel.send(str({ pull: false, tsc: false }));
		await this.Exec("git pull");

		await msg.edit(str({ pull: true, tsc: false }));
		await this.Exec("tsc");

		await msg.edit(">>> >>> 🤖 | **Update Command**:\nBot is updated - restarting...");
	}

	async Exec(command: string) {
		return new Promise((res, rej) => exec(command, (e, str) => (e ? rej(e) : res(str))));
	}
}
