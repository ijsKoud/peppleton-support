import { nanoid } from "nanoid";
import { Message, MessageEmbed } from "discord.js";
import prClient from "../../client/client";
import { iDepartment, iReport } from "../../models/interfaces";
import Report from "../../models/support/Report";

export default class reportHandler {
	constructor(public client: prClient) {}

	public async handleUpdate(message: Message, report: iReport, reason?: string) {
		const channel = await this.client.utils.getChannel(report.channelId);
		const msg = await channel.messages.fetch(report.messageId);
		const user = await this.client.utils.fetchUser(report.userId);

		if (msg)
			await msg.edit(
				new MessageEmbed(msg.embeds[0]).setDescription(
					`Report created by **${user.tag}** (${user.toString()})\nHandled by **${
						message.member.nickname || message.author.username
					}** (${message.author.toString()})`
				)
			);
		await Report.findOneAndRemove(report);

		if (reason && typeof reason === "string")
			await user
				.send(
					`>>> ${this.client.mocks.emojis.redcross} | Unfortunately your report (\`${
						report.caseId
					}\`) has been declined by **${
						message.member.nickname || message.author.username
					}** (${message.author.toString()})\`\`\`\n${reason}\n\`\`\` ❓ | If you think this is a mistake or a false judgement please make a ticket.`
				)
				.catch((e) => null);
		else
			await user
				.send(
					`>>> ${this.client.mocks.emojis.greentick} | Your report (\`${report.caseId}\`) has been accepted by the appropriate managers and will be dealt with accordingly.`
				)
				.catch((e) => null);

		await message.util.send(
			`>>> ${this.client.mocks.emojis.greentick} | Successfully **${
				reason ? "declined" : "accepted"
			}** report \`${report.caseId}\`!`
		);
	}

	public async createReport(
		message: Message,
		department: iDepartment
	): Promise<{ userId: string; messageId: string; channelId: string; caseId: string }> {
		const dm = await message.author.createDM();
		const emoji =
			this.client.emojis.cache.get(department.emojis.main)?.toString?.() ||
			department.emojis.fallback;

		const filter = (m: Message) => m.author.id === message.author.id;
		const base = (msg: string) =>
			`>>> ${emoji} | **Report Creation - ${department.name}**:\n${msg}\n\nSay \`cancel\` to cancel.`;

		// topic
		let msg = await dm.send(
			base(
				"`1` - Who you do you want to report? Please give their ROBLOX Username (this can be more than 1 username)"
			)
		);
		const topic = (await this.client.utils.awaitMessages(msg, filter)).first();
		if (
			!topic ||
			(typeof topic.content === "string" && topic.content.toLowerCase().includes("cancel"))
		) {
			await msg.edit(
				`>>> ${emoji} | **Report Creation - ${department.name}**:\nReport creation cancelled.`
			);
			return null;
		}

		// description
		msg = await dm.send(base("`2` - Why do you want to report them? Attach evidence if possible."));
		const description = (await this.client.utils.awaitMessages(msg, filter)).first();
		if (
			!description ||
			(typeof description.content === "string" &&
				description.content.toLowerCase().includes("cancel"))
		) {
			await msg.edit(
				`>>> ${emoji} | **Report Creation - ${department.name}**:\nReport creation cancelled.`
			);
			return null;
		}

		// extra
		msg = await dm.send(base("`3` - Anything else you want to add to your report?"));
		const extra = (await this.client.utils.awaitMessages(msg, filter)).first();
		if (
			!extra ||
			(typeof extra.content === "string" && extra.content.toLowerCase().includes("cancel"))
		) {
			await msg.edit(
				`>>> ${emoji} | **Report Creation - ${department.name}**:\nReport creation cancelled.`
			);
			return null;
		}

		msg = await dm.send(
			`>>> ${emoji} | **Report Creation - ${department.name}**:\n${this.client.mocks.emojis.loading} Creating a report, please wait...`
		);
		const channel = await this.client.utils.getChannel(department.guild.reports);
		const attachments = [topic.attachments, description.attachments, extra.attachments]
			.map((x) => this.client.utils.getAttachments(x))
			.filter((x) => x.filter((x) => x))
			.reduce((a, b) => {
				a.push(...b);
				return a;
			});

		const caseId = await this.generateId();
		const m = await channel.send(
			new MessageEmbed()
				.setColor(this.client.hex)
				.setAuthor(
					`New Report - ${caseId}`,
					message.author.displayAvatarURL({ dynamic: true, size: 4096 })
				)
				.setDescription(
					`Report for **${department.name}** created by **${
						message.author.tag
					}** (${message.author.toString()})\nUse \`${
						this.client.commandHandler.prefix
					}report <${caseId}> <accept/decline> [reason]\` to accept/decline the report.`
				)
				.addFields([
					{
						name: "• Users",
						value: this.substr(topic.content || "no message content"),
						inline: true,
					},
					{
						name: "• Reason",
						value: this.substr(description.content || "no message content"),
						inline: true,
					},
					{
						name: "• Extra",
						value: this.substr(extra.content || "no message content"),
						inline: true,
					},
				])
				.attachFiles(attachments)
		);

		await msg.edit(
			`>>> ${emoji} | **Report Creation - ${department.name}**:\nReport registered under the \`${caseId}\` id.\nYou will receive a DM when a **${this.client.mocks.emojis.manager} manager+** handled your report.`
		);

		return {
			messageId: m.id,
			userId: message.author.id,
			channelId: channel.id,
			caseId,
		};
	}

	public async getReport(data: {
		messageId?: string;
		caseId?: string;
		userId?: string;
	}): Promise<iReport> {
		return (await Report.findOne(data))?.toObject?.();
	}

	public async saveReport(data: {
		userId: string;
		messageId: string;
		channelId: string;
		caseId: string;
	}): Promise<iReport> {
		return Report.create({ ...data, status: "unclaimed" });
	}

	public async updateReport(
		query: {
			messageId?: string;
			caseId?: string;
			userId?: string;
		},
		data: iReport
	): Promise<iReport> {
		return Report.findOneAndUpdate(query, data);
	}

	private async generateId(): Promise<string> {
		let id = nanoid(8).toLowerCase();
		while (id.includes("-") || (await this.getReport({ caseId: `report-${id}` })))
			id = nanoid(8).toLowerCase();

		return `report-${id}`;
	}

	private substr(str: string, length: number = 1024): string {
		return str.length > length ? str.slice(0, length - 3) + "..." : str;
	}
}
