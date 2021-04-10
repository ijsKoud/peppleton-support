import { Message, MessageEmbed } from "discord.js";
import { Command } from "discord-akairo";
import { version } from "../../../package.json";
import ms from "ms";
import os from "os";

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

		await message.util.send(
			new MessageEmbed()
				.setColor(message.guild?.me?.displayHexColor || "BLACK")
				.setTitle(`Bot Stats - ${this.client.user.tag}`)
				.setDescription(
					`This is all the technical information about ${this.client.user.username}. Here you are also able to find the server count, bot uptime & the bot status. The information may not be up to date, it's the most recent information I was able to find in my cache.`
				)
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
		);
	}
}
