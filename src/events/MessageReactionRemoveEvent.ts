import {
	eventNotification,
	reactionRoleMSG,
	reactionEmojiName,
	reactionEmojiName2,
	QOTDNotifications,
} from "../../config/config";
import { MessageReaction, User } from "discord.js";
import BaseEvent from "../utils/structures/BaseEvent";
import DiscordClient from "../client/client";

export default class MessageReactionRemoveEvent extends BaseEvent {
	constructor() {
		super("messageReactionRemove");
	}

	async run(client: DiscordClient, reaction: MessageReaction, user: User) {
		try {
			if (reaction.partial) await reaction.fetch();

			const message = reaction.message;
			if (message.partial) await message.fetch(true);
			if (user.partial) await user.fetch(true);
			if (user.bot) return;

			if (message.id !== reactionRoleMSG) return;

			const member = message.guild.members.cache.get(user.id);

			switch (reaction.emoji.name) {
				case reactionEmojiName:
					const role1 = message.guild.roles.cache.get(eventNotification);
					member.roles.remove(role1);
					return user.send(`> 🔕 | I took away the **${role1.name}** role!`);
				case reactionEmojiName2:
					const role2 = message.guild.roles.cache.get(QOTDNotifications);
					member.roles.remove(role2);
					return user.send(`> 📅 | I took away the **${role2.name}** role!`);
			}
		} catch (e) {
			return;
		}
	}
}
