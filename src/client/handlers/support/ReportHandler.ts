import { Report } from "@prisma/client";
import { DMChannel, Message } from "discord.js";
import { nanoid } from "nanoid";
import { iDepartment } from "../../interfaces";
import Client from "../../Client";

export default class ReportHandler {
	constructor(public client: Client) {}

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
		const description = (await this.client.utils.awaitMessages(msg, { filter })).first();
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
		const extra = (await this.client.utils.awaitMessages(msg, { filter })).first();
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
			`>>> ${emoji} | **Report Creation - ${department.name}**:\n${this.client.constants.emojis.loading} Creating a report, please wait...`
		);
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
						message.author.displayAvatarURL({ dynamic: true, size: 4096 })
					)
					.setDescription(
						`Report for **${department.name}** created by **${
							message.author.tag
						}** (${message.author.toString()})\nUse \`${
							this.client.options.defaultPrefix
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
					]),
			],
			files: attachments,
		});

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
