import { Listener } from "discord-akairo";
import Ticket from "../models/support/Ticket";

export default class ready extends Listener {
	constructor() {
		super("ready", {
			emitter: "client",
			event: "ready",
			category: "client",
		});
	}

	async exec() {
		this.client.Api.start(80, () => this.client.log("INFO", "Api is running on port `80`."));

		await this.client.activityManager.loadAll();
		await this.client.user.setActivity("your support tickets", { type: "LISTENING" });
		this.client.log("INFO", "ActivityManager is now online.");

		this.setTimeouts();
		this.client.log("INFO", `**${this.client.user.tag}** has logged in!`);
	}

	async checkTickets() {
		const tickets = await Ticket.find();
		tickets
			.filter(({ status, lastMsg }) => status === "open" && lastMsg <= 864e5)
			.forEach((ticket) => this.client.supportHandler.ticketHandler.close(ticket, "inactive"));
	}

	setTimeouts() {
		setInterval(
			() => this.client.user.setActivity("your support tickets", { type: "LISTENING" }),
			864e5
		);
		setInterval(async () => await this.checkTickets(), 6e4);
	}
}
