import { NewsChannel, TextChannel, Collection, Message } from "discord.js";
import { writeFile } from "fs/promises";
import prClient from "../client/client";

interface iConfig {
	channel: TextChannel | NewsChannel;
	id: string;
}

export default class Transcript {
	public messageAttachmentParsing: boolean = true;
	constructor(public client: prClient, public config: iConfig) {}

	public async create(outdir: string): Promise<string> {
		let coll = new Collection<string, Message>();
		let res = await this.config.channel.messages.fetch({ limit: 100 });
		coll = coll.concat(res);

		while (res.size === 100) {
			res = await this.config.channel.messages.fetch({ limit: 100, before: res.lastKey() });
			if (res) coll = coll.concat(res);
		}

		coll.array().reverse();
		// to do: transcript everything
		// to do: save to `${this.config.id}.html`

		return null;
	}
}
