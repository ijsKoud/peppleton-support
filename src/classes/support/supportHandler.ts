import ms from "ms";
import { Message, MessageEmbed, MessageReaction, User } from "discord.js";
import { iDepartment } from "../../models/interfaces";
import prClient from "../../client/client";
import ticketHandler from "./ticketHandler";
import reportHandler from "./reportHandler";
import Blacklist from "../../models/support/Blacklist";

const cooldown = new Map<string, number>();
export default class supportHandler {
	public ticketHandler: ticketHandler;
	public reportHandler: reportHandler;
	public config = {
		ticket: true,
		suggestion: true,
		report: true,
	};

	constructor(public client: prClient) {
		this.ticketHandler = new ticketHandler(this.client);
		this.reportHandler = new reportHandler(this.client);
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

						const report = await this.reportHandler.createReport(message, department);
						if (!report) return;

						await this.reportHandler.saveReport(report);
					}
					break;
				case "suggestion":
					{
						await this.handleSuggestion(message);
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

	private async handleSuggestion(message: Message) {
		if (cooldown.has(message.author.id))
			return message.author.send(
				`>>> ⌚ | Please wait \`${ms(
					cooldown.get(message.author.id) - Date.now()
				)}\` before suggesting something again.`
			);

		const filter = (m: Message) => m.author.id === message.author.id;
		const base = (str: string) =>
			`>>> ${this.client.mocks.emojis.logo} | **Suggestions**\n${str}\n\nSay \`cancel\` to cancel.`;
		const dm = await message.author.createDM();

		let msg = await dm.send(
			base("`1` - What is your suggestion? (You can add more than 1 suggestion)")
		);
		const suggestion = (await this.client.utils.awaitMessages(msg, filter)).first();
		if (
			!suggestion ||
			!suggestion.content?.length ||
			(typeof suggestion.content === "string" &&
				suggestion.content.toLowerCase().includes("cancel"))
		) {
			await msg.edit(`>>> ${this.client.mocks.emojis.logo} | **Suggestions**:\nPrompt cancelled.`);
			return null;
		}

		msg = await dm.send(
			`>>> ${this.client.mocks.emojis.logo} | **Suggestions**\n${this.client.mocks.emojis.loading} Sending your suggestion, please wait...`
		);

		const channel = await this.client.utils.getChannel(
			this.client.mocks.departments.suggestions || null
		);
		if (!channel)
			return msg.edit(
				`>>> ${this.client.mocks.emojis.logo} | **Suggestions**\nI was unable to find the correct suggestions channel, please contact **DaanGamesDG#7621** or **Marcus N#0001** about this.`
			);

		cooldown.set(message.author.id, Date.now() + 6e4);
		setTimeout(() => cooldown.delete(message.author.id), 6e4);

		const res = await channel.send(
			`>>> ${this.client.mocks.emojis.logo} | **Suggestion - ${message.author.tag}**\`\`\`\n${suggestion.content}\`\`\``,
			{ split: true }
		);
		await msg.edit(
			`>>> ${this.client.mocks.emojis.logo} | **Suggestions**\nWe received your suggestion.`
		);

		["🔼", "🔽"].forEach(async (x) => await res[res.length - 1].react(x));
	}

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
		try {
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
						`3️⃣ - **I want to make a suggestion**`,
					])
			);

			await Promise.all(emojis.map(async (x) => await msg.react(x).catch((e) => null)));
			const res = (await this.client.utils.awaitReactions(msg, filter)).first();
			await msg.delete();

			return { "1️⃣": "ticket", "2️⃣": "report", "3️⃣": "suggestion" }[res?.emoji?.name] as
				| "ticket"
				| "report"
				| "suggestion";
		} catch (e) {
			await message.channel
				.send(
					`>>> ${
						this.client.mocks.emojis.redcross
					} | ${message.author.toString()}, I am unable to DM you, make sure your DMs are **open**.`
				)
				.catch((e) => null);
			return null;
		}
	}

	public async blacklist(
		message: Message,
		user: User,
		type: "ticket" | "report" | "suggestion",
		reason: string
	) {
		const blacklist = await user.getBlacklisted();
		if (blacklist.support.includes(type))
			return message.util.send(
				`>>> ${this.client.mocks.emojis.redcross} | This user already has the **${type}** blacklist.`
			);

		await Blacklist.findOneAndUpdate(
			{ userId: user.id },
			{ userId: user.id, type: [...blacklist.support, type] },
			{ upsert: true }
		);

		await user
			.send(`>>> 🔨 | **${type} blacklist received**\nReason: **${reason}**`)
			.catch((e) => null);
		await message.util.send(
			`>>> ${this.client.mocks.emojis.greentick} | Successfully added **${
				user.tag
			}** (${user.toString()}) to the **${type}** blacklist for **${reason}**.`,
			{ allowedMentions: { users: [] } }
		);
	}

	public async whitelist(message: Message, user: User, type: "ticket" | "report" | "suggestion") {
		const blacklist = await user.getBlacklisted();
		if (!blacklist.support.includes(type))
			return message.util.send(
				`>>> ${this.client.mocks.emojis.redcross} | This user doesn't have the **${type}** blacklist.`
			);

		await Blacklist.findOneAndUpdate(
			{ userId: user.id },
			{ userId: user.id, type: blacklist.support.filter((x) => x !== type) },
			{ upsert: true }
		);

		await message.util.send(
			`>>> ${this.client.mocks.emojis.greentick} | Successfully removed **${
				user.tag
			}** (${user.toString()}) from the **${type}** blacklist.`,
			{ allowedMentions: { users: [] } }
		);
	}
}
