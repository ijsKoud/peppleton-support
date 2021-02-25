import { Listener } from "discord-akairo";
import { MessageReaction, User, MessageEmbed } from "discord.js";
import { accessRoles, categoryId, rDepartments, tDepartments } from "../../mocks/departments";
import Ticket from "../../models/tickets/Ticket";

export default class messageReactionAdd extends Listener {
	constructor() {
		super("messageReactionAdd", {
			emitter: "client",
			event: "messageReactionAdd",
			category: "client",
		});
	}

	async exec(reaction: MessageReaction, user: User) {
		try {
			if (reaction.partial) reaction = await reaction.fetch();
			if (user.partial) user = await user.fetch();

			let message = reaction.message;
			if (message.partial) message = await message.fetch();
			if (!message.guild || message.system || message.webhookID || user.bot || user.system) return;

			const channelIds = tDepartments.map(({ channelId }) => channelId);
			const reportChannels = rDepartments.map(({ channelId }) => channelId);

			if (reportChannels.includes(message.channel.id)) return this.handleReports(reaction, user);
			if (reaction.emoji.name !== "✅" || !channelIds.includes(message.channel.id)) return;

			const ticket = await Ticket.findOne({ messageId: message.id });
			if (!ticket) return;
			if (ticket.status !== "unclaimed") return message.delete().catch((e) => null);

			ticket.status = "open";
			ticket.messageId = "";

			const channel = await message.guild.channels.create(ticket.caseId.slice(1, -1), {
				type: "text",
				permissionOverwrites: [
					{
						id: this.client.user.id,
						allow: [
							"ADD_REACTIONS",
							"SEND_MESSAGES",
							"ATTACH_FILES",
							"EMBED_LINKS",
							"MANAGE_CHANNELS",
							"VIEW_CHANNEL",
						],
					},
					{
						id: user.id,
						allow: ["SEND_MESSAGES", "ATTACH_FILES", "VIEW_CHANNEL"],
					},
					{
						id: message.guild.id,
						deny: ["VIEW_CHANNEL"],
					},
				],
			});
			accessRoles.forEach(
				async (r) =>
					await channel
						.updateOverwrite(r, { VIEW_CHANNEL: true, SEND_MESSAGES: true, ATTACH_FILES: true })
						.catch((e) => null)
			);
			await channel.setParent(categoryId).catch((e) => null);

			ticket.channelId = channel.id;
			ticket.claimerId = user.id;

			const ticketOwner = await this.client.utils.fetchUser(ticket.userId);
			if (!User) {
				channel.delete().catch((e) => null);
				return await ticket.deleteOne();
			}
			channel
				.send("", {
					files: this.client.utils.getAttachments(message.attachments),
					embed: message.embeds[0],
				})
				.then((m) => m.pin().catch((e) => null));
			message.delete();

			ticketOwner
				.send(
					`>>> 📨 | Your ticket (\`${ticket.caseId}\`) has been claimed by **${
						user.tag
					}** (${user.toString()}), Please allow them some time to read your case.`,
					{ allowedMentions: { users: [] } }
				)
				.catch(async (e) => {
					channel.delete().catch((e) => null);
					return await ticket.deleteOne();
				});

			ticket.save();
		} catch (e) {
			this.client.log("ERROR", `Reaction add event error: \`\`\`${e}\`\`\``);
		}
	}

	async handleReports(reaction: MessageReaction, user: User) {
		const { message, emoji } = reaction;

		switch (emoji.id) {
			// tick emoji
			case "793929362570870794":
				message.edit(
					new MessageEmbed(message.embeds[0])
						.setDescription(["• Status", `Report accepted by ${user.toString()}`])
						.setColor("#47B383")
				);
				break;
			// cross emojis
			case "793939269848399873":
				message.edit(
					new MessageEmbed(message.embeds[0])
						.setDescription(["• Status", `Report declined by ${user.toString()}`])
						.setColor("#C24D4F")
				);
				break;
			default:
				break;
		}

		message.reactions.removeAll();
	}
}
