import { Command } from "../../../client/structures/Command";
import { ApplyOptions } from "@sapphire/decorators";
import { Message } from "discord.js";
import { Args } from "@sapphire/framework";

@ApplyOptions<Command.Options>({
	name: "transfer",
	aliases: ["transfer"],
	description: "Transfers a ticket to another staff member",
	preconditions: ["StaffOnly", "GuildOnly"],
	usage: "<staff member>",
})
export default class TransferCommand extends Command {
	public async messageRun(message: Message, args: Args) {
		if (message.channel.type !== "GUILD_TEXT" || !message.channel.name.startsWith("ticket-"))
			return;
		const ticket = await this.container.client.supportHandler.ticketHandler.getTicket({
			channelId: message.channel.id,
		});

		if (!ticket) return;

		if (
			ticket.claimerId !== message.author.id &&
			!message.member?.permissions.has("VIEW_AUDIT_LOG", true) &&
			!this.container.client.isOwner(message.author.id)
		)
			return message.reply(
				`>>> ${this.container.client.constants.emojis.redcross} | Sorry, only ticket claimers, Bot developers and Managers+ are able to use this command in tickets.`
			);

		// if (["manager", "developer", "director"].includes(id)) return this.client.supportHandler.ticketHandler.transferDep(message, id, ticket);

		const { value: member } = await args.pickResult("member");
		const data = this.container.client.constants.departments;
		const roles = this.container.client.isDev()
			? ["739540543570444368"]
			: [data.supervisor, data.manager, data.BoD];

		if (!member || !member.roles.cache.some((r) => roles.includes(r.id)))
			return message.reply(
				`>>> ${this.container.client.constants.emojis.redcross} | Unable to find a SV+ with the provided arguments`
			);

		await this.container.client.supportHandler.ticketHandler.transferUser(message, member, ticket);
	}
}
