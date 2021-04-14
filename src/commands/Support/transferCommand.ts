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
			ownerOnly: true,
		});
	}

	async exec(message: Message, { id }: { id: string }) {
		if (message.channel.type !== "text" || !message.channel.name.startsWith("ticket-")) return;
		const ticket = await this.client.supportHandler.ticketHandler.getTicket({
			channelId: message.channel.id,
		});
		if (!ticket) return;

		// if (["manager", "developer", "director"].includes(id)) return this.client.supportHandler.ticketHandler.transferDep(message, id, ticket);

		const member = await this.client.utils.fetchMember(id, message.guild);
		if (!member || !member.hasPermission("MANAGE_MESSAGES", { checkOwner: true, checkAdmin: true }))
			return message.util.send(
				`>>> ${this.client.mocks.emojis.redcross} | Unable to find a SV+ called "${id}"`
			);
		await this.client.supportHandler.ticketHandler.transferUser(message, member, ticket);
	}
}
