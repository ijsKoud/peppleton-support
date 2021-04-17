import { TextChannel, VoiceState } from "discord.js";
import { Listener } from "discord-akairo";

export default class voiceStateUpdate extends Listener {
	constructor() {
		super("voiceStateUpdate-events", {
			emitter: "client",
			event: "voiceStateUpdate",
		});
	}

	async exec(oldState: VoiceState, newState: VoiceState): Promise<void> {
		const { eventsRole, EvoiceChannel, EtextChannel } = this.client.mocks.voice;

		if (oldState.member.partial) await oldState.member.fetch();

		if (oldState.member.roles.cache.has(eventsRole)) return;
		if (newState.channelID !== EvoiceChannel && oldState.channelID === EvoiceChannel)
			!this.client.channels.cache.has(EtextChannel)
				? ((await this.client.channels.fetch(
						EtextChannel,
						true,
						true
				  )) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: false })
				: (this.client.channels.cache.get(
						EtextChannel
				  ) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: false });
		else if (newState.channelID === EvoiceChannel && oldState.channelID !== EvoiceChannel)
			!this.client.channels.cache.has(EtextChannel)
				? ((await this.client.channels.fetch(
						EtextChannel,
						true,
						true
				  )) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: true })
				: (this.client.channels.cache.get(
						EtextChannel
				  ) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: true });
	}
}
