import { Listener } from "discord-akairo";
import {
	reactionEmojiName2,
	eventNotification,
	reactionRoleMSG,
	reactionEmojiName,
	QOTDNotifications,
} from "../../client/config";
import { MessageReaction, User } from "discord.js";

export default class messageReactionRemove extends Listener {
	constructor() {
		super("messageReactionRemove", {
			emitter: "client",
			event: "messageReactionRemove",
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
