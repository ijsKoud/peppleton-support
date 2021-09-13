import { Listener, ListenerOptions } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { VoiceState } from "discord.js";

@ApplyOptions<ListenerOptions>({ event: "voiceStateUpdate" })
export default class VoiceStateUpdateListener extends Listener {
	public async run(oldState: VoiceState, newState: VoiceState) {
		const { client } = this.container;

		const member = oldState.member || newState.member;
		if (!member)
			return client.loggers
				.get("bot")
				?.error('Received "VoiceStateUpdate" package without member object');
		if (member.user.bot) return;

		if (!oldState.channelId && newState.channelId)
			client.activityManager.start(member.id, oldState.guild.id);
		if (oldState.channelId && !newState.channelId)
			client.activityManager.end(member.id, oldState.guild.id);
	}
}
