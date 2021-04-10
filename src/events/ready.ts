import { Listener } from "discord-akairo";

export default class ready extends Listener {
	constructor() {
		super("ready", {
			emitter: "client",
			event: "ready",
			category: "client",
		});
	}

	async exec() {
		this.client.log("INFO", `**${this.client.user.tag}** has logged in!`);
		this.client.Api.start(80, () => this.client.log("INFO", "Api is running on port `80`!"));

		this.client.user.setActivity("your support tickets", { type: "LISTENING" });
		setInterval(
			() => this.client.user.setActivity("your support tickets", { type: "LISTENING" }),
			864e5
		);
	}
}
