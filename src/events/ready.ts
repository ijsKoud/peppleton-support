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
		this.client.user.setActivity(`${this.client.user.username} is online!`, { type: "PLAYING" });
		setInterval(
			() =>
				this.client.user.setActivity(`${this.client.user.username} is online!`, {
					type: "PLAYING",
				}),
			864e5
		);
	}
}
