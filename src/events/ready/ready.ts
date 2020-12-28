import { guildId } from "../../../config/config";
import BaseEvent from "../../utils/structures/BaseEvent";
import DiscordClient from "../../client/client";
import { ticketTimeout } from "../../utils/database/schemas";

export default class ReadyEvent extends BaseEvent {
	constructor() {
		super("ready");
	}
	async run(client: DiscordClient) {
		const guild = await client.guilds.fetch(guildId);
		const valid = guild.channels.cache.filter((c) =>
			c.name.endsWith("-ticket")
		);
		valid.forEach((c) => client.openTickets.set(c.name.slice(0, -7), true));
		valid.forEach(async (c) => {
			const data = await ticketTimeout.findOne({ channelId: c.id });
			if (!data) return;
			client.activeTickets.set(c.id, {
				reason: "",
				lastMsg: data.get("lastMsg"),
			});
		});

		setInterval(() => {
			client.activeTickets.forEach((v, k) =>
				ticketTimeout
					.findOneAndUpdate(
						{ channelId: k },
						{ channelId: k, lastMsg: v.lastMsg },
						{ upsert: true }
					)
					.catch((e) => console.log(e))
			);
		}, 6e4);

		setInterval(() => {
			client.activeTickets.forEach(async (v, k) => {
				Date.now() - v.lastMsg >= 864e5 /* 5e3 */
					? client.activeTickets.set(k, {
							reason: "inactive",
							lastMsg: v.lastMsg,
					  }) &&
					  (
							client.channels.cache.get(k) || (await client.channels.fetch(k))
					  ).delete()
					: "";
			});
		}, 1e3);

		console.log(`${client.user.tag} has logged in!`);
		client.user.setActivity("your support tickets!", { type: "LISTENING" });
	}
}
