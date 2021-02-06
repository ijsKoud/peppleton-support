import { exec } from "child_process";
import { Command } from "discord-akairo";
import { Message, MessageAttachment, TextChannel } from "discord.js";
import { join } from "path";
import { transcriptionsChannel } from "../../client/config";

export default class closeCommand extends Command {
	public constructor() {
		super("close", {
			aliases: ["close"],
			category: "tickets",
			description: {
				content: "Closes a ticket, admins can force close a ticket.",
				usage: "close",
			},
			ratelimit: 1,
			cooldown: 1e3,
			channel: "guild",
		});
	}

	async exec(message: Message) {
		if (message.channel.type !== "text" || !message.channel.name.endsWith("-ticket")) return;

		let allowed: boolean = false;
		if (message.channel.topic.includes(message.author.id)) allowed = true;
		else if (this.client.isOwner(message.author)) allowed = true;
		else if (message.member.hasPermission("VIEW_AUDIT_LOG", { checkAdmin: true, checkOwner: true }))
			allowed = true;

		if (!allowed) return message.react("❌");

		exec(
			`DiscordChatExporter.Cli.exe export -c ${message.channel.id} -t ${
				this.client.token
			} -o ${join(__dirname, "..", "..", "transcriptions")} -b`,
			{
				cwd: join(process.cwd(), "transcriptor"),
			},
			async (e, m) => {
				if (e) this.client.log(`Transcript error: ${e}`);
				try {
					const tsChannel = (await this.client.channels.fetch(
						transcriptionsChannel
					)) as TextChannel;
					tsChannel.send(
						new MessageAttachment(
							join(
								__dirname,
								"..",
								"..",
								"..",
								"transcriptions",
								`${message.guild.name} - ${
									(message.channel as TextChannel).parent?.name || "text"
								} - ${(message.channel as TextChannel).name} [${message.channel.id}].html`
							),
							`${message.channel.id}-ticket.html`
						)
					);
				} catch (e) {
					this.client.log(`Transcript error: ${e}`);
				}

				message.util.send(`>>> 🗑 | Deleting the channel in **5 seconds**...`);
				setTimeout(() => message.channel.delete("closed by claimer"), 5e3);
			}
		);
	}
}
