import { Listener, ListenerOptions } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { VoiceState } from "discord.js";

@ApplyOptions<ListenerOptions>({ event: "voiceStateUpdate" })
export default class VoiceStateUpdateListener extends Listener {
	public async run(oldState: VoiceState, newState: VoiceState): Promise<void> {
		const { client } = this.container;

		if (!oldState.member) return;

		if (!oldState.channelId && newState.channelId)
			client.activityManager.start(oldState.member.id, oldState.guild.id);
		if (oldState.channelId && !newState.channelId)
			client.activityManager.end(oldState.member.id, oldState.guild.id);
	}
}
