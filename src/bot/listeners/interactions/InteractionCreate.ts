import { Listener, ListenerOptions } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { Interaction } from "discord.js";

@ApplyOptions<ListenerOptions>({ once: false, event: "interactionCreate" })
export default class ReadyListener extends Listener {
	public run(interaction: Interaction): void {
		this.container.client.supportHandler.ticketHandler.handleInteraction(interaction);
	}
}
