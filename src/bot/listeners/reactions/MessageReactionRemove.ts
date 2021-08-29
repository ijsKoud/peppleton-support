import { Listener, ListenerOptions } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { MessageReaction, User } from "discord.js";
import Logger from "../../../client/structures/Logger";

@ApplyOptions<ListenerOptions>({ once: false, event: "messageReactionRemove" })
export default class MessageReactionRemoveListener extends Listener {
	private logger!: Logger;

	public async run(reaction: MessageReaction, user: User) {
		const { client } = this.container;
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		this.logger = client.loggers.get("bot")!;

		try {
			if (reaction.partial) reaction = await reaction.fetch();

			let message = reaction.message;
			if (message.partial) message = await message.fetch(true);
			if (user.partial) user = await user.fetch(true);
			if (user.bot || user.system || !message.guild) return;

			const messageIds = client.constants.reactionRoles.roles.map(({ messageId }) => messageId);
			if (!messageIds.includes(message.id)) return;

			const reactionRole = client.constants.reactionRoles.roles.find(
				({ reactionId }) => reactionId === (reaction.emoji.name || reaction.emoji.id)
			);
			if (!reactionRole) return;

			const member = await client.utils.fetchMember(user.id, message.guild);
			if (!member) return;

			const role = message.guild.roles.cache.get(reactionRole.roleId);
			if (!role) return;

			await member.roles.remove(role);
			await member
				.send(`>>> ${reactionRole.reactionId} | I took away the **${role.name}** role!`)
				.catch(() => void 0);
		} catch (e) {
			this.logger.error(
				`messageReactionRemove event error: \`\`\`${(e as any).stack || (e as any).message}\`\`\``
			);
		}
	}
}
