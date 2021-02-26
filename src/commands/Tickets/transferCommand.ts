import { Message } from "discord.js";
import { Command } from "discord-akairo";
import { hDepartments } from "../../mocks/departments";
import Ticket from "../../models/tickets/Ticket";
import { mRole } from "../../mocks/general";

export default class transferCommand extends Command {
	constructor() {
		super("transfer", {
			aliases: ["transfer"],
			channel: "guild",
			cooldown: 3e3,
			description: {
				content: "Transfer a ticket to someone else or a different department",
				usage: "transfer <user id/department name>",
			},
			args: [
				{
					id: "id",
					type: "string",
					match: "rest",
				},
			],
		});
	}

	async exec(message: Message, { id }: { id: string }) {
		if (message.channel.type !== "text" || !message.channel.name.startsWith("ticket-")) return;
		if (!id)
			return message.util.send(
				">>> ❗ | Missing the `id` argument. Please provide a user id or department name"
			);
		const location = this.resolve(id);
		if (!location)
			return message.util.send(
				">>> ❗ | Invalid location provided, please provide a user id or a department name (manager, developer, director)."
			);

		const ticket = await Ticket.findOne({ channelId: message.channel.id });
		if (!ticket) return message.util.send(">>> 🎫 | This isn't a ticket channel.");
		if (
			!ticket ||
			(ticket.claimerId !== message.author.id &&
				!message.member.hasPermission("VIEW_AUDIT_LOG", { checkAdmin: true, checkOwner: true }) &&
				!this.client.isOwner(message.author.id))
		)
			return message.util.send(
				`>>> ${this.client.utils.emojiFinder(
					"redtick"
				)} | Sorry, only ticket claimers, Managers+ and Bot developers are able to use this command in tickets.`
			);

		switch (location.type) {
			case "user":
				{
					const user = await this.client.utils.fetchMember(location.id, message.guild);
					const oldUser = await this.client.utils.fetchMember(ticket.claimerId, message.guild);

					if (!user) return message.util.send(">>> 🔎 | No user found.");
					if (ticket.claimerId === user.id)
						return message.util.send(">>> 🎫 | This user is already ticket claimer.");

					ticket.claimerId = user.id;
					message.channel.updateOverwrite(user, {
						SEND_MESSAGES: true,
						VIEW_CHANNEL: true,
						ATTACH_FILES: true,
					});
					message.channel.updateOverwrite(oldUser, {
						VIEW_CHANNEL: oldUser?.roles.cache.has(mRole) || false ? true : false,
					});
					message.channel.updateOverwrite(message.guild.me, {
						SEND_MESSAGES: true,
						VIEW_CHANNEL: true,
						ATTACH_FILES: true,
					});
					message.channel.updateOverwrite("304986851310043136", {
						SEND_MESSAGES: true,
						VIEW_CHANNEL: true,
						ATTACH_FILES: true,
					});

					(await this.client.utils.fetchUser(ticket.userId)).send(
						`>>> 📨 | Your ticket has been transfered to **${
							user.nickname || user.user.username
						}**, you should receive a message shortly.`
					);

					await ticket.save();
					message.util.send(
						`>>> 👋 | ${user.toString()}, please check the pins for more information!`,
						{
							allowedMentions: { users: [user.id] },
						}
					);
				}
				break;

			case "channel":
				{
					const channel = await this.client.utils.getChannel(location.id);
				}
				break;
		}
	}

	resolve(id: string): { type: "channel" | "user"; id: string } {
		if (!isNaN(Number(id))) return { type: "user", id };
		else {
			const department = hDepartments.find(({ name }) =>
				name.toLowerCase().includes(id.toLowerCase())
			);
			if (!department) return null;

			return {
				type: "channel",
				id: department.channelId,
			};
		}
	}
}
