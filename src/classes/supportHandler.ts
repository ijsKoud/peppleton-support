import { Message, MessageEmbed, MessageReaction, User } from "discord.js";
import { iDepartment } from "../models/interfaces";
import prClient from "../client/client";
import ticketHandler from "./ticketHandler";

export default class supportHandler {
	public ticketHandler: ticketHandler;
	public config = {
		ticket: true,
		suggestion: true,
		report: true,
	};

	constructor(public client: prClient) {
		this.ticketHandler = new ticketHandler(this.client);
	}

	public async support(message: Message): Promise<any> {
		try {
			const option = await this.getOption(message);
			if (!option) return;

			if (!this.config[option])
				return message.author.send(
					`>>> 🔒 | **${option}s** are currently closed, please try again later!`
				);

			const blacklisted = await message.author.getBlacklisted();
			if (blacklisted.support.includes(option))
				return message.author.send(
					`>>> ${this.client.mocks.emojis.redcross} | Sorry, you are blacklisted. You are unable to use the **${option}** feature.`
				);

			switch (option) {
				case "ticket":
					{
						const data = await this.ticketHandler.getTicket({ userId: message.author.id });
						if (data)
							return message.author.send(
								`>>> 🎫 | You already created a ticket (${data.caseId}), please close this ticket first or raise your question(s) there.`
							);

						const department = await this.getDepartment(message);
						if (!department) return;

						const ticket = await this.ticketHandler.createTicket(message, department);
						if (!ticket) return;

						await this.ticketHandler.saveTicket(ticket);
					}
					break;
				case "report":
					{
						const department = await this.getDepartment(message);
						if (!department) return;
					}
					break;
				case "suggestion":
					{
					}
					break;
				default:
					return;
			}
		} catch (e) {
			message.author
				.send(
					`>>> ❗ | **Uknown Error Event**:\`\`\`xl\n${e.message}\n\`\`\`ℹ | This error is most likely on our side- please **screenshot** this error message, as well as your input, and send it to **DaanGamesDG#7621** or **Marcus N#0001**.`
				)
				.catch((e) => null);
			this.client.log(
				"ERROR",
				`supportHandler#support() error: \`\`\`${e.stack || e.message}\`\`\``
			);
		}
	}

	private async createReport(message: Message, department: iDepartment): Promise<void> {}

	private async getDepartment(message: Message): Promise<iDepartment> {
		const emojis = this.client.mocks.departments.tickets.map(
			({ emojis }) => this.client.emojis.cache.get(emojis.main)?.toString?.() || emojis.fallback
		);

		const filter = (reaction: MessageReaction, user: User) =>
			user.id === message.author.id &&
			emojis.includes(reaction.emoji.toString() || reaction.emoji.name);

		let msg = await message.author.send(
			new MessageEmbed()
				.setColor(this.client.hex)
				.setTitle("Please select a department")
				.setFooter(
					"This prompt will close in 60s",
					this.client.user.displayAvatarURL({ size: 4096 })
				)
				.setDescription(
					this.client.mocks.departments.tickets.map(({ name }, i) => `${emojis[i]} - **${name}**`)
				)
		);

		await Promise.all(emojis.map(async (x) => await msg.react(x).catch((e) => null)));
		const res = (await this.client.utils.awaitReactions(msg, filter)).first();
		await msg.delete();

		if (!res || !res.emoji) return null;

		return this.client.mocks.departments.tickets.find(({ emojis }) =>
			`${emojis.main}-${emojis.fallback}`.includes(res.emoji.id || res.emoji.name)
		);
	}

	private async getOption(message: Message): Promise<"ticket" | "report" | "suggestion"> {
		const emojis = ["1️⃣", "2️⃣", "3️⃣"];

		const filter = (reaction: MessageReaction, user: User) =>
			user.id === message.author.id && emojis.includes(reaction.emoji.id || reaction.emoji.name);

		const msg = await message.author.send(
			new MessageEmbed()
				.setColor(this.client.hex)
				.setTitle("Please select an option to continue")
				.setFooter(
					"This prompt will close in 60s",
					this.client.user.displayAvatarURL({ size: 4096 })
				)
				.setDescription([
					`1️⃣ - **I want to open a ticket**`,
					`2️⃣ - **I want to report a user**`,
					`3️⃣ - **I want make a suggestion**`,
				])
		);

		await Promise.all(emojis.map(async (x) => await msg.react(x).catch((e) => null)));
		const res = (await this.client.utils.awaitReactions(msg, filter)).first();
		await msg.delete();

		// @ts-expect-error
		return { "1️⃣": "ticket", "2️⃣": "report", "3️⃣": "suggestion" }[res?.emoji?.name];
	}

	private substr(str: string, length: number = 1024): string {
		return str.length > length ? str.slice(0, length - 3) + "..." : str;
	}
}
