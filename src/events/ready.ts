import { Listener } from "discord-akairo";

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
		this.client.log("INFO", `✅ | **${this.client.user.tag}** has logged in!`);
		this.client.user.setActivity("Oslo is ready for testing!", { type: "PLAYING" });
	}
}
