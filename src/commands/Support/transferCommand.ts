import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class transferCommand extends Command {
	constructor() {
		super("transfer", {
			aliases: ["transfer"],
			userPermissions: ["MANAGE_MESSAGES"],
			clientPermissions: ["MANAGE_CHANNELS"],
			description: {
				content: "transfer a ticket",
				usage: "transfer <user/department>",
			},
			channel: "guild",
			args: [
				{
					id: "id",
					type: "lowercase",
				},
			],
		});
	}

	async exec(message: Message, { id }: { id: string }) {
		if (message.channel.type !== "text" || !message.channel.name.startsWith("ticket-")) return;
		const ticket = await this.client.supportHandler.ticketHandler.getTicket({
			channelId: message.channel.id,
		});
		if (!ticket) return;

		if (
			ticket.claimerId !== message.author.id &&
			!message.member.hasPermission("VIEW_AUDIT_LOG", { checkAdmin: true, checkOwner: true }) &&
			!this.client.isOwner(message.author)
		)
			return message.util.send(
				`>>> ${this.client.mocks.emojis.redcross} | Sorry, only ticket claimers, Bot developers and Managers+ are able to use this command in tickets.`
			);

		// if (["manager", "developer", "director"].includes(id)) return this.client.supportHandler.ticketHandler.transferDep(message, id, ticket);

		const member = await this.client.utils.fetchMember(id, message.guild);
		if (!member || !member.hasPermission("MANAGE_MESSAGES", { checkOwner: true, checkAdmin: true }))
			return message.util.send(
				`>>> ${this.client.mocks.emojis.redcross} | Unable to find a SV+ called "${id}"`
			);
		await this.client.supportHandler.ticketHandler.transferUser(message, member, ticket);
	}
}
