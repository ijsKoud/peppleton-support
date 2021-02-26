import ms from "ms";
import { Message, MessageEmbed } from "discord.js";
import { Command } from "discord-akairo";
import { version, repository } from "../../../package.json";
import fetch from "node-fetch";
import os from "os";
import Ticket from "../../models/tickets/Ticket";

export default class stats extends Command {
	constructor() {
		super("stats", {
			aliases: ["stats"],
			clientPermissions: ["EMBED_LINKS"],
			description: {
				content: "Some interesting stats.",
				usage: "stats",
			},
		});
	}

	async exec(message: Message) {
		const core = os.cpus()[0];

		message.util.send(
			new MessageEmbed()
				.setColor(this.client.hex)
				.setTitle(`Bot Stats - ${this.client.user.tag}`)
				.addField(
					"• General Information",
					`\`\`\`${[
						`System Platform: ${os.platform()}`,
						`System Uptime: ${ms(os.uptime() * 1000, { long: true })}`,
					].join("\n")}\`\`\``
				)
				.addField(
					"• Cpu Information",
					`\`\`\`${[
						`${core.model}`,
						`Cores: ${os.cpus().length.toString()} | Speed: ${core.speed.toString()}mhz`,
					].join("\n")}\`\`\``
				)
				.addField(
					"• Memory Usage",
					`\`\`\`${[
						`Total Memory: ${this.client.utils.formatBytes(process.memoryUsage().heapTotal)}`,
						`Used Memory: ${this.client.utils.formatBytes(process.memoryUsage().heapUsed)}`,
					].join("\n")}\`\`\``
				)
				.addField(
					"• Bot Information",
					`\`\`\`${[
						`Client Uptime: ${ms(this.client.uptime, { long: true })}`,
						`Client Version: v${version}`,
					].join("\n")}\`\`\``
				)
				.addField(
					"• Ticket info",
					(
						(await Ticket.find())
							.map(
								({ caseId, status, userId }) => `\`${caseId}\` - <@${userId}> | Status: ${status}`
							)
							.join("\n") || "No tickets found"
					).substr(0, 1024)
				)
				.addField("• Github Info", (await this.commits()).substr(0, 1024))
		);
	}

	async commits(): Promise<string> {
		const repo = repository.url.slice("https://github.com/".length);
		const json = await (await fetch(`https://api.github.com/repos/${repo}/commits`)).json();

		let str = "";
		if (!Array.isArray(json)) return `[Private repository](${repository.url})`;
		for (const { sha, html_url, commit, author } of json.slice(0, 5)) {
			str += `[\`${sha.slice(0, 7)}\`](${html_url}) ${commit.message
				.substring(0, 80)
				.replace(/\/n/g, "")} - **[@${author.login.toLowerCase()}](${author.html_url})**\n`;
		}

		return str || `No commits found for [${repo}](${repository.url})`;
	}
}
