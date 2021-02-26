import { accessRoles, categoryId, rDepartments, tDepartments } from "../../mocks/departments";
import { MessageReaction, User, MessageEmbed, Message, Guild } from "discord.js";
import reactionRoles from "./../../mocks/reactionRoles";
import { GoogleSpreadsheet } from "google-spreadsheet";
import Feedback from "../../models/guild/Feedback";
import Ticket from "../../models/tickets/Ticket";
import { prLogo, sRole } from "../../mocks/general";
import { Listener } from "discord-akairo";

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
			const messageIds = reactionRoles.map(({ messageId }) => messageId);

			if (messageIds.includes(message.id))
				return this.reactionRole(reaction.emoji.name || reaction.emoji.id, message.guild, user);
			if (reaction.emoji.name === "📋") return this.feedback(message, user);
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
						id: message.guild.id,
						deny: ["VIEW_CHANNEL"],
					},
				],
			});
			await channel
				.updateOverwrite(sRole, {
					VIEW_CHANNEL: false,
				})
				.catch((e) => null);
			await channel
				.updateOverwrite(user.id, {
					SEND_MESSAGES: true,
					ATTACH_FILES: true,
					VIEW_CHANNEL: true,
				})
				.catch((e) => null);

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
					embed: new MessageEmbed(message.embeds[0]).setDescription(
						message.embeds[0].description.replace("React with `✅` to claim this ticket!", "")
					),
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

	async feedback(message: Message, user: User) {
		const config = await Feedback.findOne({ guildId: message.guild.id });
		if (!config || message.id !== config.messageId) return;

		const msg: Message = await user
			.send(
				`>>> ${this.client.utils.emojiFinder(
					"loading"
				)} | Searching for your feedback, please wait...`
			)
			.catch((e) => null);
		if (!message) return;

		try {
			const doc = new GoogleSpreadsheet(process.env.SHEET);
			doc.useApiKey(process.env.API_KEY);
			await doc.loadInfo();

			const sheet = doc.sheetsByIndex[0];
			const rows = await sheet.getRows();
			const data = rows.find((r) => r.discordID == user.id);
			const state = rows.find((r) => r.discordID == user.id);

			if (data && (!state || !state.passed || !state.feedback))
				throw new Error("Missing `state`, `state.data` or `state.feedback` property.");
			const feedback = data
				? `>>> ${this.client.emojis.cache.get(prLogo)?.toString() || "📖"} | You **${
						state.passed
				  }** this application session, here is your feedback: \`\`\`${
						(data.feedback as string).length > 850
							? (data.feedback as string).substr(0, 850 - 3) + "..."
							: (data.feedback as string)
				  }\`\`\` ❓ | Questions about the feedback? Open a ticket with the topic \`feedback question\` and a staff member will help you as soon as possible.`
				: ">>> 👤 | Sorry I didn't find your user id in the database, if you think I am wrong, please open a ticket and the staff team is happy to help!";

			msg.edit(feedback);
		} catch (e) {
			this.client.log("ERROR", `Feedback error: \`\`\`${e}\`\`\``);
		}
	}

	async reactionRole(id: string, guild: Guild, user: User) {
		const reactionRole = reactionRoles.find((r) => r.reactionId === id);
		if (!reactionRole) return;

		const member = await this.client.utils.fetchMember(user.id, guild);
		if (!member) return;

		const role = guild.roles.cache.get(reactionRole.roleId);
		member.roles.add(role);
		member
			.send(`>>> ${reactionRole.reactionId} | I just gave you the **${role.name}** role!`)
			.catch((e) => null);
	}
}
