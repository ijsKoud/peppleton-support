import { MessageReaction, User } from "discord.js";
import { Listener } from "discord-akairo";

export default class messageReactionRemove extends Listener {
	constructor() {
		super("messageReactionRemove", {
			emitter: "client",
			event: "messageReactionRemove",
		});
	}

	async exec(reaction: MessageReaction, user: User) {
		try {
			if (reaction.partial) reaction = await reaction.fetch();

			let message = reaction.message;
			if (message.partial) message = await message.fetch(true);
			if (user.partial) user = await user.fetch(true);
			if (user.bot || user.system) return;

			const messageIds = this.client.mocks.reactionRoles.roles.map(({ messageId }) => messageId);
			if (!messageIds.includes(message.id)) return;

			const reactionRole = this.client.mocks.reactionRoles.roles.find(
				({ reactionId }) => reactionId === (reaction.emoji.name || reaction.emoji.id)
			);
			if (!reactionRole) return;

			const member = await this.client.utils.fetchMember(user.id, message.guild);
			if (!member) return;

			const role = message.guild.roles.cache.get(reactionRole.roleId);
			await member.roles.remove(role);
			await member
				.send(`>>> ${reactionRole.reactionId} | I took away the **${role.name}** role!`)
				.catch((e) => null);
		} catch (e) {
			return this.client.log(
				"ERROR",
				`Reaction Role Error: \`\`\`\n${e.stack || e.message}\n\`\`\``
			);
		}
	}
}
