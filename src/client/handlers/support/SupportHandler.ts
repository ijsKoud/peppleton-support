import { DMChannel, Message, MessageActionRow, MessageButton } from "discord.js";
import { iDepartment } from "../../interfaces";
import Client from "../../Client";
import Logger from "../../structures/Logger";
import ms from "ms";
import TicketHandler from "./TicketHandler";

export default class SupportHandler {
	public logger: Logger;
	public active: Map<string, boolean> = new Map();
	public cooldown: Map<string, number> = new Map();

	public ticketHandler: TicketHandler;

	public config = {
		ticket: true,
		suggestion: true,
		report: true,
	};

	constructor(public client: Client) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		this.logger = client.loggers.get("support")!;
		this.ticketHandler = new TicketHandler(client);
	}

	public async handleMention(message: Message) {
		if (this.active.has(message.author.id)) return;
		this.active.set(message.author.id, true);

		try {
			const res = await this.getOption(message);
			if (!res) return this.active.delete(message.author.id);

			const { option, channel } = res;

			// @ts-ignore
			if (!this.config[option]) {
				this.active.delete(message.author.id);
				return channel.send(
					`>>> 🔒 | **${option}s** are currently disabled, please try again later!`
				);
			}

			if (option === "suggestion") return this.handleSuggestion(channel, message);

			const department = await this.getDepartment(channel);
			if (!department) return this.active.delete(message.author.id);

			switch (option) {
				case "ticket":
					{
						const data = await this.ticketHandler.createTicket(message, channel, department);
						if (!data) return;

						await this.ticketHandler.saveTicket({ ...data, department: department.name });
					}
					break;
			}
		} catch (e) {
			this.active.delete(message.author.id);
			this.logger.error(e);
		}
	}

	protected async getOption(
		message: Message
	): Promise<{ channel: DMChannel; option: string } | null> {
		try {
			const dm = await message.author.createDM();

			const embeds = this.client.utils.createEmbed({
				title: "Please select an option to continue",
				description: [
					"1️⃣ - **I want to open a ticket**",
					"2️⃣ - **I want to report a user**",
					"3️⃣ - **I want to make a suggestion**",
				].join("\n"),
				footer: {
					text: "This prompt will close in 60s",
					iconURL: this.client.user?.displayAvatarURL({ size: 4096 }),
				},
			});

			const ids = [
				`${message.author.id}-ticket`,
				`${message.author.id}-report`,
				`${message.author.id}-suggestion`,
			];
			const components = [
				new MessageActionRow().addComponents(
					new MessageButton().setStyle("SECONDARY").setEmoji("1️⃣").setCustomId(ids[0]),
					new MessageButton().setStyle("SECONDARY").setEmoji("2️⃣").setCustomId(ids[1]),
					new MessageButton().setStyle("SECONDARY").setEmoji("3️⃣").setCustomId(ids[2])
				),
			];

			const msg = await dm.send({ embeds, components });
			const button = await this.client.utils.awaitComponent(msg, {
				componentType: "BUTTON",
				filter: (e) => ids.includes(e.customId),
			});

			if (!button) return null;
			await button.deferUpdate();
			await msg.delete();

			return {
				channel: dm,
				option: button.customId.split(/-/g)[1],
			};
		} catch (e) {
			await message.reply({
				content: `>>> ${this.client.constants.emojis.redcross} | I am unable to DM you, make sure your DMs are **open**.`,
				allowedMentions: { repliedUser: true },
			});

			return null;
		}
	}

	protected async handleSuggestion(channel: DMChannel, message: Message) {
		try {
			const cooldown = this.cooldown.get(message.author.id);
			if (cooldown) {
				this.active.delete(message.author.id);
				return channel.send(
					`>>> ${
						this.client.constants.emojis.error
					} | To prevent spam we have added a \`1 minute\` cooldown, please try again in \`${ms(
						cooldown - Date.now(),
						{ long: true }
					)}\`.`
				);
			}

			await channel.send({
				content:
					"Please provide me with the suggestions you have (1 message with 4000 characters max)\n\nSay `cancel` to cancel!",
			});

			const res = (
				await this.client.utils.awaitMessages(message, {
					filter: (m) => m.author.id === message.author.id,
				})
			).first();

			if (!res || res.content.toLowerCase().startsWith("cancel")) {
				await channel.send("Prompt cancelled.");
				return this.active.delete(message.author.id);
			}

			const msg = await channel.send(
				`>>> ${this.client.constants.emojis.loading} | Sending your suggestion to the server...`
			);

			const suggestionChannel = await this.client.utils.getChannel(
				this.client.constants.departments.suggestions
			);
			if (!suggestionChannel)
				return msg.edit(
					`>>> ${this.client.constants.emojis.logo} | **Suggestions**\nI was unable to find the correct suggestions channel, please contact **DaanGamesDG#7621** or **Marcus N#0001** about this.`
				);

			const m = await channel.send(
				`>>> ${this.client.constants.emojis.logo} | **Suggestion - ${message.author.tag}**\`\`\`\n${res.content}\`\`\``
			);

			await Promise.all([["🔼", "🔽"].map((x) => m.react(x))]);

			this.cooldown.set(message.author.id, Date.now() + 6e4);
			setTimeout(() => this.cooldown.delete(message.author.id), 6e4);

			await msg.edit(
				`>>> ${this.client.constants.emojis.greentick} | Successfully delivered your suggestion!`
			);
		} catch (e) {
			this.logger.warn("Unkown Error (Suggestions)", e);
		}
	}

	protected async getDepartment(channel: DMChannel): Promise<iDepartment | null> {
		const departments = this.client.constants.departments.tickets;

		const emojis = departments.map(
			(dep) => this.client.emojis.cache.get(dep.emojis.main)?.toString?.() ?? dep.emojis.fallback
		);

		try {
			const embeds = this.client.utils.createEmbed({
				title: "Please select a department",
				description: departments.map(({ name }, i) => `${emojis[i]} - **${name}**`).join("\n"),
				footer: {
					text: "This prompt will close in 60s",
					iconURL: this.client.user?.displayAvatarURL({ size: 4096 }),
				},
			});

			const components = [
				new MessageActionRow().addComponents(
					...departments.map(({ name }, i) =>
						new MessageButton().setStyle("SECONDARY").setEmoji(emojis[i]).setCustomId(name)
					)
				),
			];

			const msg = await channel.send({ embeds, components });
			const button = await this.client.utils.awaitComponent(msg, {
				componentType: "BUTTON",
				filter: (e) => departments.map((dep) => dep.name).includes(e.customId),
			});

			if (!button) return null;
			await button.deferUpdate();
			await msg.delete();

			return departments.find((dep) => dep.name === button.customId) ?? null;
		} catch (e) {
			return null;
		}
	}
}
