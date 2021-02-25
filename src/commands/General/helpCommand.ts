import { Command } from "discord-akairo";
import { MessageEmbed } from "discord.js";
import { Message } from "discord.js";
import ms from "ms";

export default class helpCommand extends Command {
	public constructor() {
		super("help", {
			aliases: ["help", "commands", "cmd"],
			clientPermissions: ["EMBED_LINKS"],
			description: {
				content: "Shows you the list of available commands, or more info about a specific one.",
				usage: "help [command]",
			},
			args: [
				{
					id: "command",
					type: "commandAlias",
				},
			],
		});
	}

	public exec(message: Message, { command }: { command: Command }) {
		const embed = new MessageEmbed()
			.setColor(message.member?.displayHexColor || "#9298F4")
			.setThumbnail(
				message.guild?.iconURL({ dynamic: true, size: 4096 }) ||
					message.author.displayAvatarURL({ dynamic: true, size: 4096 })
			)
			.setFooter(`❗ | The prefix for this bot is "${this.handler.prefix}"`)
			.setTitle(`Help Command - ${message.author.tag}`);

		if (command) {
			const userPermissions = this.client.utils.formatPerms(
				(command.userPermissions as string[]) || []
			);
			const clientPermissions = this.client.utils.formatPerms(
				(command.clientPermissions as string[]) || []
			);

			embed.setDescription([
				`>>> 🏷 | **Name**: ${command.id}`,
				`📁 | **Category**: ${command.category}`,
				`🔖 | **Aliases**: \`${command.aliases.join("`, `") || "-"}\`\n`,
				`📋 | **Usage**: ${command.description.usage || "-"}`,
				`📘 | **Description**: ${command.description.content || "-"}\n`,
				`👮‍♂️ | **User Permissions**: ${userPermissions || "-"}`,
				`🤖 | **Client Permissions**: ${clientPermissions || "-"}`,
				`⌚ | **Cooldown**: \`${ms(command.cooldown || 0, { long: false })}\``,
			]);
		} else {
			for (const category of this.handler.categories.values()) {
				if (["ownerOnly"].includes(category.id) && !this.client.isOwner(message.author.id))
					continue;

				embed.addField(
					`• ${category.id}`,
					"`" +
						(category
							.filter((c) =>
								c.categoryID === category.id &&
								c.aliases.length > 0 &&
								this.client.isOwner(message.author.id)
									? true
									: !c.ownerOnly
							)
							.map((c) => c.id)
							.join("`, `") || "No commands for this category") +
						"`",
					true
				);
			}
		}

		message.util.send(embed);
	}
}
