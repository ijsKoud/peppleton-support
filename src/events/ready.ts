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
		this.client.log(`✅ | **${this.client.user.tag}** has logged in!`);
	}
}
