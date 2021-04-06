import { Message, MessageAttachment, TextChannel, MessageEmbed } from "discord.js";
import { Command } from "discord-akairo";

import { exec } from "child_process";
import { unlink } from "fs/promises";
import { join } from "path";

import Ticket from "../../models/tickets/Ticket";
import { transcripts } from "../../mocks/general";

export default class closeCommand extends Command {
	public constructor() {
		super("close", {
			aliases: ["close"],
			channel: "guild",
			description: {
				content: "Closes a ticket and transcripts the channel if enabled",
				usage: "close",
			},
			args: [
				{
					id: "flag",
					type: (_: Message, str: string) =>
						str ? (["true", "false"].includes(str.toLowerCase()) ? str.toLowerCase() : null) : null,
					match: "option",
					flag: ["-force=", "--force="],
					default: "false",
				},
			],
		});
	}

	async exec(message: Message, { flag }: { flag: string }) {
		console.log(flag);
		if (message.channel.type !== "text") return;
		if (!message.channel.name.startsWith("ticket-")) return;

		const ticket = await Ticket.findOne({ channelId: message.channel.id });
		await message.util.send(">>> 📁 | Saving ticket transcript, please wait...");
		if (
			!ticket ||
			(ticket.claimerId !== message.author.id &&
				!message.member.hasPermission("VIEW_AUDIT_LOG", { checkAdmin: true, checkOwner: true }) &&
				!this.client.isOwner(message.author.id))
		)
			return message.util.send(
				`>>> ${this.client.utils.emojiFinder(
					"redtick"
				)} | Sorry, only ticket claimers, Managers+ and Bot developers are able to use this command in tickets.`
			);

		const channel = await this.client.utils.getChannel(transcripts);
		message.channel.startTyping();
		if (flag === "false")
			try {
				exec(
					`${
						process.platform === "win32"
							? "DiscordChatExporter.Cli.exe"
							: "dotnet DiscordChatExporter.Cli.dll"
					} export -c ${message.channel.id} -t ${this.client.token} -o ${join(
						__dirname,
						"..",
						"..",
						"..",
						"transcripts",
						`${ticket.caseId}.html`
					)} -b`,
					{
						cwd: join(process.cwd(), "chatExporter"),
					},
					async (e, stdout) => {
						if (e) throw new Error(e.stack || e.message);

						const dir = join(__dirname, "..", "..", "..", "transcripts", `${ticket.caseId}.html`);

						await channel
							.send(
								new MessageEmbed()
									.setTitle(`transcript ${ticket.caseId.slice(1, -1)}`)
									.setDescription(
										`Ticket claimer: <@${ticket.claimerId}>\nTicket owner: <@${
											ticket.userId
										}>\nClosed by ${message.author.toString()}`
									)
									.setColor(this.client.hex)
							)
							.catch((e) => null);
						channel.send(new MessageAttachment(dir, `${ticket.caseId}.html`)).catch((e) => null);

						ticket.status = "closed";
						await ticket.save();

						message.channel.stopTyping();

						setTimeout(() => {
							message.channel.delete("deleted by user");
						}, 5e3);
						message.util.send(">>> 🗑 | Deleting this ticket in **5 seconds**!");
					}
				);
			} catch (e) {
				this.client.log("ERROR", `Transcript error: \`\`\`${e}\`\`\``);
				message.util.send(">>> 📁 | I was unable to transcript this channel.");
			}
		else {
			ticket.status = "closed";
			await ticket.save();

			message.channel.stopTyping();

			setTimeout(() => message.channel.delete("deleted by user"), 5e3);
			message.util.send(">>> 🗑 | Deleting this ticket in **5 seconds**!");
		}
	}
}
