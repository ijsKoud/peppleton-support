import { DMChannel, Interaction, Message, MessageActionRow, MessageButton } from "discord.js";
import { nanoid } from "nanoid";
import Client from "../../Client";
import { iDepartment, iTicket } from "../../interfaces";
import Logger from "../../structures/Logger/Logger";

export default class TicketHandler {
	public logger: Logger;

	constructor(public client: Client) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		this.logger = client.loggers.get("support")!;
	}

	public async handleInteraction(interaction: Interaction) {
		if (!interaction.isButton()) return;
		if (!interaction.customId.startsWith("ticket-")) return;

		await interaction.deferUpdate().catch();

		const ticket = await this.getTicket({ caseId: interaction.customId });
		if (!ticket || ticket.status !== "unclaimed") {
			await interaction.deleteReply().catch();
			return;
		}

		if (!interaction.inGuild()) return;
		if (!interaction.guild)
			return this.logger.warn(
				"Received guild interaction without Guild property",
				interaction.toJSON()
			);

		const member = await this.client.utils.fetchMember(
			interaction.member.user.id,
			interaction.guild
		);
		if (!member)
			return this.logger.warn(
				"Received guild interaction without Member property",
				interaction.toJSON()
			);

		const department = this.client.constants.departments.tickets.find(
			(d) => d.name.toLowerCase() === ticket.department.toLowerCase()
		);
		if (!department)
			return this.logger.warn(
				"Received guild interaction without valid department property",
				JSON.stringify(ticket)
			);

		if (!member.roles.cache.some((r) => department.guild.roleIds.includes(r.id))) return;
		ticket.status = "open";
		ticket.claimerId = member.id;
	}

	public getTicket(data: Partial<iTicket>) {
		return this.client.prisma.ticket.findFirst({ where: data });
	}

	public async saveTicket({
		userId,
		caseId,
		department,
	}: {
		userId: string;
		caseId: string;
		department: string;
	}) {
		try {
			await this.client.prisma.ticket.create({ data: { caseId, userId, department } });
			this.logger.debug(`Successfully saved ticket for ${userId} with caseId: ${caseId}`);
		} catch (e) {
			this.logger.fatal(e);
		}
	}

	public async createTicket(
		message: Message,
		dm: DMChannel,
		department: iDepartment
	): Promise<{ userId: string; caseId: string } | null> {
		const emoji =
			this.client.emojis.cache.get(department.emojis.main)?.toString?.() ||
			department.emojis.fallback;

		const filter = (m: Message) => m.author.id === message.author.id;
		const base = (msg: string) =>
			`>>> ${emoji} | **Ticket Creation - ${department.name}**:\n${msg}\n\nSay \`cancel\` to cancel.`;

		// topic
		let msg = await dm.send(base("`1` - What is the topic of your question?"));
		const topic = (await this.client.utils.awaitMessages(msg, { filter })).first();
		if (
			!topic ||
			(typeof topic.content === "string" && topic.content.toLowerCase().includes("cancel"))
		) {
			await msg.edit(
				`>>> ${emoji} | **Ticket Creation - ${department.name}**:\nTicket creation cancelled.`
			);
			return null;
		}

		// description
		msg = await dm.send(base("`2` - Please explain in full what question is."));
		const description = (await this.client.utils.awaitMessages(msg, { filter })).first();
		if (
			!description ||
			(typeof description.content === "string" &&
				description.content.toLowerCase().includes("cancel"))
		) {
			await msg.edit(
				`>>> ${emoji} | **Ticket Creation - ${department.name}**:\nTicket creation cancelled.`
			);
			return null;
		}

		// extra
		msg = await dm.send(base("`3` - Anything else you want to add to your ticket?"));
		const extra = (await this.client.utils.awaitMessages(msg, { filter })).first();
		if (
			!extra ||
			(typeof extra.content === "string" && extra.content.toLowerCase().includes("cancel"))
		) {
			await msg.edit(
				`>>> ${emoji} | **Ticket Creation - ${department.name}**:\nTicket creation cancelled.`
			);
			return null;
		}

		msg = await dm.send(
			`>>> ${emoji} | **Ticket Creation - ${department.name}**:\n${this.client.constants.emojis.loading} Creating a ticket, please wait...`
		);
		const channel = await this.client.utils.getChannel(department.guild.tickets);
		const caseId = await this.generateId();

		const components = [
			new MessageActionRow().addComponents(
				new MessageButton().setStyle("SUCCESS").setEmoji("✔").setCustomId(caseId)
			),
		];
		const attachments = [topic.attachments, description.attachments, extra.attachments]
			.map((x) => this.client.utils.getAttachments(x))
			.filter((x) => x.filter((y) => y))
			.reduce((a, b) => {
				a.push(...b);
				return a;
			});

		const embeds = this.client.utils.createEmbed({
			author: {
				name: `New ticket - ${caseId}`,
				iconURL: message.author.displayAvatarURL({ dynamic: true, size: 4096 }),
			},
			description: `Ticket for **${department.name}** created by **${
				message.author.tag
			}** (${message.author.toString()})\nPress the button to claim!`,
			fields: [
				{
					name: "• Topic",
					value: this.substr(topic.content || "no message content"),
					inline: true,
				},
				{
					name: "• Description",
					value: this.substr(description.content || "no message content"),
					inline: true,
				},
				{
					name: "• Extra",
					value: this.substr(extra.content || "no message content"),
					inline: true,
				},
			],
		});

		if (!channel || !channel.isText()) return null;
		await channel.send({ embeds, files: attachments, components });

		await msg.edit(
			`>>> ${emoji} | **Ticket Creation - ${department.name}**:\nTicket registered under the \`${caseId}\` id. If you don't receive an answer within **24 hours**, please contact a **${this.client.constants.emojis.supervisor} supervisor+**.`
		);

		return {
			userId: message.author.id,
			caseId,
		};
	}

	public async generateId(): Promise<string> {
		let id = nanoid(8).toLowerCase();
		const tickets = await this.client.prisma.ticket.findMany();

		while (id.includes("-") || tickets.find((t) => t.caseId === `ticket-${id}`))
			id = nanoid(8).toLowerCase();

		return `ticket-${id}`;
	}

	private substr(str: string, length = 1024): string {
		return str.length > length ? str.slice(0, length - 3) + "..." : str;
	}
}
