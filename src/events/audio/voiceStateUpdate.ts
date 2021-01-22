import { Listener } from "discord-akairo";
import { TextChannel, VoiceState } from "discord.js";
import { eventsTeam, eventsTextChannel, eventsVoiceChannel } from "../../client/config";

export default class voiceStateUpdate extends Listener {
	constructor() {
		super("voiceStateUpdate", {
			emitter: "client",
			event: "voiceStateUpdate",
			category: "client",
		});
	}

	async exec(oldState: VoiceState, newState: VoiceState): Promise<void> {
		if (oldState.member.partial) await oldState.member.fetch();

		if (oldState.member.roles.cache.has(eventsTeam)) return;
		if (newState.channelID !== eventsVoiceChannel && oldState.channelID === eventsVoiceChannel)
			!this.client.channels.cache.has(eventsTextChannel)
				? ((await this.client.channels.fetch(
						eventsTextChannel,
						true,
						true
				  )) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: false })
				: (this.client.channels.cache.get(
						eventsTextChannel
				  ) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: false });
		else if (newState.channelID === eventsVoiceChannel && oldState.channelID !== eventsVoiceChannel)
			!this.client.channels.cache.has(eventsTextChannel)
				? ((await this.client.channels.fetch(
						eventsTextChannel,
						true,
						true
				  )) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: true })
				: (this.client.channels.cache.get(
						eventsTextChannel
				  ) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: true });
	}
}
