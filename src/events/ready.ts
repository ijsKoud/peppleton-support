import { Listener } from "discord-akairo";
import Ticket from "../models/tickets/Ticket";

export default class ready extends Listener {
	constructor() {
		super("ready", {
			emitter: "client",
			event: "ready",
			category: "client",
		});
	}

	async exec(): Promise<void> {
		this.client.log("INFO", `**${this.client.user.tag}** has logged in!`);
		this.client.user.setActivity("your support tickets!", { type: "LISTENING" });

		setInterval(
			() => this.client.user.setActivity("your support tickets!", { type: "LISTENING" }),
			864e5
		);
		setInterval(() => this.tickets(), 6e5);
	}

	async tickets() {
		const tickets = await Ticket.find();
		tickets
			.filter(({ lastMsg }) => lastMsg && Date.now() - lastMsg > 864e5)
			.forEach(async ({ channelId }) =>
				(await this.client.utils.getChannel(channelId))?.delete("inactive for 24h")
			);
	}
}
