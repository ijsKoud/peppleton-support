// https://discord.js.org/#/docs/main/stable/class/Client?scrollTo=e-channelCreate
import { DMChannel, GuildChannel, TextChannel } from "discord.js";
import BaseEvent from "../utils/structures/BaseEvent";
import DiscordClient from "../client/client";
import { writeFile } from "fs/promises";

export default class ChannelCreateEvent extends BaseEvent {
	constructor() {
		super("channelCreate");
	}

	async run(client: DiscordClient, channel: DMChannel | GuildChannel) {
		if (channel.type !== "text") return;
		channel = channel as TextChannel;

		if (!channel.name.endsWith("-ticket")) return;

		const owner = await client.users.fetch(channel.name.slice(0, -7));
		client.activeTickets.set(channel.id, {
			reason: "",
			lastMsg: channel.createdTimestamp,
		});
		await writeFile(
			`./src/transcriptions/${owner.id}-ticket.txt`,
			`Transcription - Ticket owner: ${owner.tag}`,
			"utf-8"
		).catch((e) => console.log(`file create error ` + e));
	}
}
