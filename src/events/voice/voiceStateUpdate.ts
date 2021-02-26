import { eventsRole, textChannel, voiceChannel } from "../../mocks/events";
import { TextChannel, VoiceState } from "discord.js";
import { Listener } from "discord-akairo";

export default class voiceStateUpdate extends Listener {
	constructor() {
		super("voiceStateUpdate", {
			emitter: "client",
			event: "voiceStateUpdate",
		});
	}

	async exec(oldState: VoiceState, newState: VoiceState): Promise<void> {
		if (oldState.member.partial) await oldState.member.fetch();

		if (oldState.member.roles.cache.has(eventsRole)) return;
		if (newState.channelID !== voiceChannel && oldState.channelID === voiceChannel)
			!this.client.channels.cache.has(textChannel)
				? ((await this.client.channels.fetch(
						textChannel,
						true,
						true
				  )) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: false })
				: (this.client.channels.cache.get(
						textChannel
				  ) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: false });
		else if (newState.channelID === voiceChannel && oldState.channelID !== voiceChannel)
			!this.client.channels.cache.has(textChannel)
				? ((await this.client.channels.fetch(
						textChannel,
						true,
						true
				  )) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: true })
				: (this.client.channels.cache.get(
						textChannel
				  ) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: true });
	}
}
