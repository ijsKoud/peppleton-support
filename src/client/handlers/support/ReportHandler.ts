import { Report } from "@prisma/client";
import { DMChannel, Message } from "discord.js";
import { nanoid } from "nanoid";
import { iDepartment } from "../../interfaces";
import Client from "../../Client";
import Logger from "../../structures/Logger";

export default class ReportHandler {
	public logger: Logger;
	constructor(public client: Client) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		this.logger = client.loggers.get("support")!;
	}

	public async handleUpdate(message: Message, report: Report, reason?: string | null) {
		const channel = await this.client.utils.getChannel(report.channelId);
		if (!channel)
			return this.logger.error(`Expected TEXT_CHANNEL, received null for ${report.channelId}`);

		if (!channel.isText())
			return this.logger.error(
				`Expected TEXT_CHANNEL, received ${channel.type} for ${report.channelId}`
			);

		const msg = await channel.messages.fetch(report.messageId);
		const user = await this.client.utils.fetchUser(report.userId);

		if (msg)
			await msg.edit({
				embeds: [
					this.client.utils
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						.embed(msg.embeds[0]!)
						.setDescription(
							`Report created by **${user?.tag}** (${user?.toString()})\nHandled by **${
								message.member?.nickname || message.author.username
							}** (${message.author.toString()})`
						),
				],
			});

		await this.client.prisma.report.delete({ where: { caseId: report.caseId } });

		if (reason && typeof reason === "string")
			await user
				?.send(
					`>>> ${this.client.constants.emojis.redcross} | Unfortunately your report (\`${
						report.caseId
					}\`) has been declined by **${
						message.member?.nickname || message.author.username
					}** (${message.author.toString()})\`\`\`\n${reason}\n\`\`\` ❓ | If you think this is a mistake or a false judgement please open a ticket.`
				)
				.catch(() => void 0);
		else
			await user
				?.send(
					`>>> ${this.client.constants.emojis.greentick} | Your report (\`${report.caseId}\`) has been accepted by the appropriate managers and will be dealt with accordingly.`
				)
				.catch(() => void 0);

		await message.reply(
			`>>> ${this.client.constants.emojis.greentick} | Successfully **${
				reason ? "declined" : "accepted"
			}** report \`${report.caseId}\`!`
		);
	}

	public async createReport(
		message: Message,
		dm: DMChannel,
		department: iDepartment
	): Promise<{ userId: string; messageId: string; channelId: string; caseId: string } | null> {
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
		const topic = (await this.client.utils.awaitMessages(msg, { filter })).first();
		if (!topic || topic.content.toLowerCase() === "cancel") {
			await msg.edit(
				`>>> ${emoji} | **Report Creation - ${department.name}**:\nReport creation cancelled.`
			);
			return null;
		}

		// description
		msg = await dm.send(base("`2` - Why do you want to report them? Attach evidence if possible."));
		const description = (await this.client.utils.awaitMessages(msg, { filter })).first();
		if (!description || description.content.toLowerCase() === "cancel") {
			await msg.edit(
				`>>> ${emoji} | **Report Creation - ${department.name}**:\nReport creation cancelled.`
			);
			return null;
		}

		// extra
		msg = await dm.send(base("`3` - Anything else you want to add to your report?"));
		const extra = (await this.client.utils.awaitMessages(msg, { filter })).first();
		if (!extra || extra.content.toLowerCase() === "cancel") {
			await msg.edit(
				`>>> ${emoji} | **Report Creation - ${department.name}**:\nReport creation cancelled.`
			);
			return null;
		}

		msg = await dm.send(
			`>>> ${emoji} | **Report Creation - ${department.name}**:\n${this.client.constants.emojis.loading} Creating a report, please wait...`
		);

		const data = await this._createReport(department, topic, description, message);
		if (!data) return null;

		const { channel, caseId, message: m } = data;

		await msg.edit(
			`>>> ${emoji} | **Report Creation - ${department.name}**:\nReport registered under the \`${caseId}\` id.\nYou will receive a DM when a **${this.client.constants.emojis.manager} manager+** handled your report.`
		);

		return {
			messageId: m.id,
			userId: message.author.id,
			channelId: channel.id,
			caseId,
		};
	}

	public async _createReport(
		department: iDepartment,
		topic: Message,
		description: Message,
		extra: Message
	) {
		const channel = await this.client.utils.getChannel(department.guild.reports);
		const attachments = [topic.attachments, description.attachments, extra.attachments]
			.map((x) => this.client.utils.getAttachments(x))
			.filter((x) => x.filter((v) => v))
			.reduce((a, b) => {
				a.push(...b);
				return a;
			});

		if (!channel || !channel.isText()) return null;

		const caseId = await this.generateId();
		const m = await channel.send({
			embeds: [
				this.client.utils
					.embed()
					.setAuthor(
						`New Report - ${caseId}`,
						topic.author.displayAvatarURL({ dynamic: true, size: 4096 })
					)
					.setDescription(
						`Report for **${department.name}** created by **${
							topic.author.tag
						}** (${topic.author.toString()})\nUse \`${
							this.client.options.defaultPrefix
						}handle ${caseId} <accept/decline> [reason]\` to accept/decline the report.`
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
					]),
			],
			files: attachments,
		});

		return { message: m, channel: m.channel, caseId };
	}

	public async getReport(caseId: string): Promise<Report | null> {
		return this.client.prisma.report.findFirst({ where: { caseId } });
	}

	public async getReports(): Promise<Report[]> {
		return this.client.prisma.report.findMany();
	}

	public async saveReport(data: {
		userId: string;
		messageId: string;
		channelId: string;
		caseId: string;
	}): Promise<Report | null> {
		return this.client.prisma.report.create({ data: { ...data, status: "unclaimed" } });
	}

	public async updateReport(caseId: string, data: Report): Promise<Report> {
		return this.client.prisma.report.update({ where: { caseId }, data });
	}

	private async generateId(): Promise<string> {
		let id = nanoid(8).toLowerCase();
		const reports = await this.getReports();

		while (id.includes("-") || reports.find((report) => report.caseId === `report-${id}`))
			id = nanoid(8).toLowerCase();

		return `report-${id}`;
	}

	private substr(str: string, length = 1024): string {
		return str.length > length ? str.slice(0, length - 3) + "..." : str;
	}
}
