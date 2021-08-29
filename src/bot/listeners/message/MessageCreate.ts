import { Listener, ListenerOptions } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { Message } from "discord.js";

@ApplyOptions<ListenerOptions>({ once: false, event: "messageCreate" })
export default class MessageCreateListener extends Listener {
	public async run(message: Message) {
		if (message.author.bot || message.system || message.webhookId) return;
		if (message.content && message.content.includes("[PING]")) await this.pings(message);

		if (
			/<((@!?\d+)|(:.+?:\d+))>/g.test(message.content.trim().split(/ +/g).shift() ?? "") &&
			message.mentions.users.has(this.container.client.user?.id ?? "") &&
			message.content.trim().split(/ +/g).length === 1
		)
			return this.container.client.supportHandler.handleMention(message);

		this.container.client.supportHandler.ticketHandler.handleMessages(message);
		if (
			message.guildId &&
			!message.content.startsWith(this.container.client.options.defaultPrefix?.toString() ?? "!")
		)
			this.container.client.activityManager.update(message.author.id, message.guildId);
	}

	private async pings(message: Message) {
		if (this.container.client.constants.pings[message.channel.id])
			await message.channel.send({
				content: this.container.client.constants.pings[message.channel.id],
				allowedMentions: { roles: ["797902390208364594", "739489234892750919"] },
			});
	}
}
