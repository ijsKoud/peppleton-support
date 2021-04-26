import { Listener } from "discord-akairo";
import { Message } from "discord.js";

export default class message extends Listener {
	constructor() {
		super("message", {
			emitter: "client",
			event: "message",
		});
	}

	async exec(message: Message) {
		try {
			if (message.author.bot || message.system || message.webhookID) return;
			if (message.content && message.content.includes("[PING]")) await this.pings(message);
			if (
				message.guild &&
				!message.content?.trim?.().startsWith?.(this.client.commandHandler.prefix as string)
			)
				await this.client.activityManager.update(message.author.id, message.guild.id);

			if (
				/<((@!?\d+)|(:.+?:\d+))>/g.test(message.content.trim().split(/ +/g).shift()) &&
				message.mentions.users.has(this.client.user.id) &&
				message.content.trim().split(/ +/g).length === 1
			)
				return this.client.supportHandler.support(message);

			if (
				message.channel.type === "dm" ||
				(message.channel.type === "text" && message.channel.name.startsWith("ticket-"))
			)
				return this.client.supportHandler.ticketHandler.handleMessages(message);
		} catch (e) {
			this.client.log("ERROR", `Message event error: \`\`\`${e.stack || e.message}\`\`\``);
		}
	}

	async pings(message: Message) {
		if (this.client.mocks.pings.data[message.channel.id])
			await message.channel.send(this.client.mocks.pings.data[message.channel.id]);
	}
}
