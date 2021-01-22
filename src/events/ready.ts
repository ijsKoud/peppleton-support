import { Listener } from "discord-akairo";
import blacklist from "../models/blacklist";
import ticket from "../models/ticket";
import { TextChannel } from "discord.js";

export default class ready extends Listener {
	constructor() {
		super("ready", {
			emitter: "client",
			event: "ready",
			category: "client",
		});
	}

	async exec(): Promise<void> {
		// client stuff
		this.client.log(`✅ | **${this.client.user.tag}** has logged in!`);
		this.client.user.setActivity("your support tickets!", { type: "LISTENING" });

		// blacklist timeout resume
		const blacklisted = await blacklist.find();
		blacklisted.forEach((b) =>
			setTimeout(() => b.delete(), (Date.now() - b.get("endDate")) as number)
		);

		// 24h inactive check - every 10m
		setInterval(async () => {
			const arr: string[] = [];
			const tickets = await ticket.find();

			tickets.forEach((t) =>
				((Date.now() - t.get("lastMessage")) as number) > 864e5
					? arr.push(t.get("channelId"))
					: null
			);

			arr.forEach(async (c) => (await this.getChannel(c)).delete());
		}, 6e5);
	}

	async getChannel(id: string): Promise<TextChannel> {
		return (this.client.channels.cache.get(id) ||
			(await this.client.channels.fetch(id))) as TextChannel;
	}
}
