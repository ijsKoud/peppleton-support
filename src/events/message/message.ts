import {
	eventsChannel,
	eventNotification,
	guildId,
	QOTDNotifications,
	QOTDChannel,
} from "../../../config/config";
import BaseEvent from "../../utils/structures/BaseEvent";
import { Message } from "discord.js";
import DiscordClient from "../../client/client";

export default class MessageEvent extends BaseEvent {
	constructor() {
		super("message");
	}

	async run(client: DiscordClient, message: Message) {
		if (message.author.bot) return;

		if (
			message.mentions.has(client.user) &&
			message.content.trim().split(/\s+/)[0].includes(client.user.id)
		)
			return client.emit("dm", message);
		if (
			message.channel.type == "dm" ||
			message.channel.name.endsWith("-ticket")
		)
			return client.emit("ticketChat", message);
		if (message.guild.id !== guildId) return;

		if (message.content.includes("[PING]")) this.handlePing(message);

		if (message.content.startsWith(client.prefix)) {
			const [cmdName, ...cmdArgs] = message.content
				.slice(client.prefix.length)
				.trim()
				.split(/\s+/);
			const command = client.commands.get(cmdName);
			if (command) {
				command.run(client, message, cmdArgs);
			}
		}
	}
	handlePing(message: Message) {
		switch (message.channel.id) {
			case eventsChannel:
				return message.channel.send(
					`> <@&${eventNotification}>, new events notification 🔼`
				);
			case QOTDChannel:
				return message.channel.send(
					`> <@&${QOTDNotifications}>, new events notification 🔼`
				);
		}
	}
}
