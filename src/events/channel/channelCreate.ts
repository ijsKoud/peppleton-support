import { Listener } from "discord-akairo";
import { DMChannel, GuildChannel, TextChannel } from "discord.js";
import { writeFile } from "fs/promises";

export default class channelCreate extends Listener {
	constructor() {
		super("channelCreate", {
			emitter: "client",
			event: "channelCreate",
			category: "client",
		});
	}

	async exec(channel: DMChannel | GuildChannel): Promise<void> {
		if (channel.type !== "text") return;
		channel = channel as TextChannel;
		if (!channel.name.endsWith("-ticket")) return;

		const owner = await this.client.users.fetch(channel.name.slice(0, -7));
		await writeFile(
			`./src/transcriptions/${owner.id}-ticket.txt`,
			`Transcription - Ticket owner: ${owner.tag}`,
			"utf-8"
		).catch((e) => console.log(`file create error ` + e));
	}
}
