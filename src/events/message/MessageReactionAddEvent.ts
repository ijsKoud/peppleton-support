import {
	eventNotification,
	reactionRoleMSG,
	reactionEmojiName,
	feedbackMsgId,
	feedbackSheet,
	prEmoji,
} from "../../config/config";
import { MessageReaction, User } from "discord.js";
import { GoogleSpreadsheet } from "google-spreadsheet";
import BaseEvent from "../../utils/structures/BaseEvent";
import DiscordClient from "../../client/client";

const check = new Map<string, boolean>();

export default class MessageReactionAddEvent extends BaseEvent {
	constructor() {
		super("messageReactionAdd");
	}

	async run(client: DiscordClient, reaction: MessageReaction, user: User) {
		try {
			if (reaction.partial) await reaction.fetch();

			const message = reaction.message;
			if (message.partial) await message.fetch(true);
			if (user.partial) await user.fetch(true);
			if (user.bot) return;

			if (message.id === feedbackMsgId && reaction.emoji.name === "🗒️")
				return this.handleFeedback(client, user, reaction);
			if (message.id !== reactionRoleMSG) return;

			const member = message.guild.members.cache.get(user.id);

			switch (reaction.emoji.name) {
				case reactionEmojiName:
					const role = message.guild.roles.cache.get(eventNotification);
					member.roles.add(role);
					return user.send(`> 🔔 | I just gave you the **${role.name}** role!`);
			}
		} catch (e) {
			return;
		}
	}

	async handleFeedback(
		client: DiscordClient,
		user: User,
		reaction: MessageReaction
	) {
		try {
			if (check.has(user.id)) return reaction.users.remove(user);
			const msg = await user.send(
				`> ${client.utils
					.EmojiFinder("loading")
					.toString()} | Searching for your feedback... please wait.`
			);
			reaction.users.remove(user);
			const doc = new GoogleSpreadsheet(feedbackSheet);
			doc.useApiKey(process.env.GOOGLE_DOCS_API);

			await doc.loadInfo();
			const sheet = doc.sheetsByIndex[0];
			const rows = await sheet.getRows();
			const data = rows.find((r) => r.discordID == user.id);
			const state = rows.find((r) => r.discordID == user.id);

			const feedback = data
				? `> ${prEmoji} | You **${
						state.passed
				  }** this application session, here is your feedback: \`\`\`${
						(data.feedback as string).length > 850
							? (data.feedback as string).substr(0, 850 - 3) + "..."
							: (data.feedback as string)
				  }\`\`\` ❓ | Questions about the feedback? Open a ticket with the topic \`feedback question\` and a staff member will help you as soon as possible.`
				: "> 👤 | Sorry I didn't find your user id in the database, if you think I am wrong, please open a ticket and the staff team is happy to help!";

			check.set(user.id, true);
			setTimeout(() => check.delete(user.id), 5e3);

			return msg.edit(feedback);
		} catch (e) {
			check.delete(user.id);
			return console.log(e);
		}
	}
}
