import { Listener } from "discord-akairo";
import {
	reactionEmojiName2,
	eventNotification,
	reactionRoleMSG,
	reactionEmojiName,
	feedbackSheet,
	prEmoji,
	QOTDNotifications,
	googleApi,
	DrivingReports,
	DispatchReports,
	guardReports,
	otherReports,
} from "../../client/config";
import { MessageReaction, User } from "discord.js";
import { GoogleSpreadsheet } from "google-spreadsheet";
import feedback from "../../models/feedback";
import { MessageEmbed } from "discord.js";

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
			if (reaction.partial) await reaction.fetch();

			const message = reaction.message;
			if (message.partial) await message.fetch(true);
			if (user.partial) await user.fetch(true);
			if (user.bot) return;

			if (
				[DrivingReports, DispatchReports, guardReports, otherReports].includes(
					message.channel.id
				) &&
				message.author.id === this.client.user.id
			)
				this.handleReports(reaction, user);

			const shema = await feedback.findOne({ guild: message.guild.id });
			const feedbackMsgId = (shema?.get("message") as string) || "";
			if (message.id === feedbackMsgId && reaction.emoji.name === "📋")
				return this.handleFeedback(user);

			if (message.id !== reactionRoleMSG) return;

			const member = message.guild.members.cache.get(user.id);

			switch (reaction.emoji.name) {
				case reactionEmojiName:
					const role1 = message.guild.roles.cache.get(eventNotification);
					member.roles.add(role1);
					return user.send(`> 🔔 | I just gave you the **${role1.name}** role!`);
				case reactionEmojiName2:
					const role2 = message.guild.roles.cache.get(QOTDNotifications);
					member.roles.add(role2);
					return user.send(`> 📅 | I just gave you the **${role2.name}** role!`);
			}
		} catch (e) {
			return this.client.log(`⚠ | **Reaction Role Error**: \`${e.stack}\``);
		}
	}

	async handleFeedback(user: User) {
		try {
			const msg = await user.send(`> ⏳ | Searching for your feedback... please wait.`);
			const doc = new GoogleSpreadsheet(feedbackSheet);
			doc.useApiKey(googleApi);

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

			return msg.edit(feedback);
		} catch (e) {
			return this.client.log(`⚠ | Oops, we ran into an error: \`${e}\``);
		}
	}

	async handleReports(reaction: MessageReaction, user: User) {
		const { message, emoji } = reaction;

		switch (emoji.id) {
			// tick emoji
			case "793929362570870794":
				message.edit(
					new MessageEmbed(message.embeds[0])
						.spliceFields(0, message.embeds[0].fields.length)
						.addField("• Status", `Report accepted by ${user.toString()}`)
						.setColor("#47B383")
				);
				break;
			// cross emojis
			case "793939269848399873":
				message.edit(
					new MessageEmbed(message.embeds[0])
						.spliceFields(0, message.embeds[0].fields.length)
						.addField("• Status", `Report declined by ${user.toString()}`)
						.setColor("#C24D4F")
				);
				break;
			default:
				break;
		}

		message.reactions.removeAll();
	}
}
