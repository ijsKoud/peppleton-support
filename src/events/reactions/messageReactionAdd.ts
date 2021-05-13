import { Listener } from "discord-akairo";
import { MessageReaction, Message, User, Guild } from "discord.js";
import { GoogleSpreadsheet } from "google-spreadsheet";
import Feedback from "../../models/support/Feedback";

const cooldowns = new Map<string, number>();
export default class messageReactionAdd extends Listener {
	constructor() {
		super("messageReactionAdd", {
			emitter: "client",
			event: "messageReactionAdd",
		});
	}

	async exec(reaction: MessageReaction, user: User) {
		try {
			if (reaction.partial) reaction = await reaction.fetch();
			if (reaction.message.partial) reaction.message = await reaction.message.fetch();
			if (user.partial) user = await user.fetch();

			if (!reaction.message.guild) return;

			const ticketDep = this.client.mocks.departments.tickets.find(
				({ guild }) => guild.tickets === reaction.message.channel.id
			);

			if (ticketDep)
				return this.client.supportHandler.ticketHandler.handleReactions(reaction, user, ticketDep);

			if (this.client.mocks.reactionRoles.channel === reaction.message.channel.id)
				return this.reactionRole(reaction.emoji.name, reaction.message.guild, user);

			const feedback = await Feedback.findOne({ guildId: reaction.message.guild.id });
			if (feedback && feedback.messageId === reaction.message.id && reaction.emoji.name === "📋")
				await this.feedback(reaction.message, user);
		} catch (e) {
			this.client.log(
				"ERROR",
				`messageReactionAdd event error: \`\`\`${e.stack || e.message}\`\`\``
			);
		}
	}

	async reactionRole(id: string, guild: Guild, user: User) {
		const reactionRole = this.client.mocks.reactionRoles.roles.find((r) => r.reactionId === id);
		if (!reactionRole) return;

		const member = await this.client.utils.fetchMember(user.id, guild);
		if (!member) return;

		const role = await this.client.utils.getRole(reactionRole.roleId, guild);
		await member.roles.add(role);
		await member
			.send(`>>> ${reactionRole.reactionId} | I just gave you the **${role.name}** role!`)
			.catch((e) => null);
	}

	async feedback(message: Message, user: User) {
		const blacklist = await user.getBlacklisted();
		if (blacklist.bot || user.bot) return;

		let cooldown = cooldowns.get(user.id) ?? 0;
		if (cooldown > 2)
			return this.client.log(
				"WARN",
				`Feedback - Blocking feedback request from user **${
					user.tag
				}** (${user.toString()})\nReason: \`Overloading the API\``
			);

		const msg: Message = await user
			.send(`>>> ${this.client.mocks.emojis.loading} | Searching for your feedback, please wait...`)
			.catch((e) => null);

		if (!message) return;

		try {
			if (cooldown === 0) setTimeout(() => cooldowns.delete(user.id), 5e3);
			cooldowns.set(user.id, cooldown + 1);

			const doc = new GoogleSpreadsheet(process.env.SHEET);
			doc.useApiKey(process.env.API_KEY);
			await doc.loadInfo();

			const sheet = doc.sheetsByIndex[0];
			const rows = await sheet.getRows();
			const data = rows.find((r) => r.discordID == user.id);
			const state = rows.find((r) => r.discordID == user.id);

			if (data && (!state || !state.passed || !state.feedback))
				throw new Error(
					`Missing \`state\` object, \`state.passed\` or \`state.feedback\` property.\nData provided:\nState {\npassed: ${
						state?.passed ? "found" : "not found"
					},\nfeedback: ${state?.feedback ? "found" : "not found"}\n}`
				);
			const feedback = data
				? `>>> ${this.client.mocks.emojis.logo} | You **${
						state.passed
				  }** this application session, here is your feedback: \`\`\`${
						(data.feedback as string).length > 850
							? (data.feedback as string).substr(0, 850 - 3) + "..."
							: (data.feedback as string)
				  }\`\`\` ❓ | Questions about the feedback? Mention me to create a ticket.`
				: ">>> 👤 | Sorry I didn't find your user id in the database, if you think I am wrong, please open a ticket.";

			await msg.edit(feedback);
		} catch (e) {
			await msg
				.edit(
					`>>> ${this.client.mocks.emojis.redcross} | Oops, something went wrong. Please try again later!`
				)
				.catch((e) => null);
			this.client.log(
				"ERROR",
				`Feedback - Blocking feedback request from user **${
					user.tag
				}** (${user.toString()})\nReason: \`ERROR\`\n\`\`\`\n${e.stack || e.message}\n\`\`\``
			);
		}
	}
}
