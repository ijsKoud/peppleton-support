import { Listener } from "discord-akairo";
import { MessageReaction, User } from "discord.js";

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

			const ticketDep = this.client.mocks.departments.tickets.find(
				({ guild }) => guild.channelId === reaction.message.channel.id
			);

			if (ticketDep)
				return this.client.supportHandler.ticketHandler.handleReactions(reaction, user, ticketDep);
		} catch (e) {
			this.client.log(
				"ERROR",
				`messageReactionAdd event error: \`\`\`${e.stack || e.message}\`\`\``
			);
		}
	}
}
