import { TextChannel, VoiceState } from "discord.js";
import { Listener } from "discord-akairo";

export default class voiceStateUpdate extends Listener {
	constructor() {
		super("voiceStateUpdate-lounge", {
			emitter: "client",
			event: "voiceStateUpdate",
		});
	}

	async exec(oldState: VoiceState, newState: VoiceState): Promise<void> {
		const { GvoiceChannel, GtextChannel } = this.client.mocks.voice;
		const { manager, botDev } = this.client.mocks.departments;

		if (oldState.member.partial) await oldState.member.fetch();

		if (oldState.member.roles.cache.has(botDev) || oldState.member.roles.cache.has(manager)) return;
		if (newState.channelID !== GvoiceChannel && oldState.channelID === GvoiceChannel)
			!this.client.channels.cache.has(GtextChannel)
				? ((await this.client.channels.fetch(
						GtextChannel,
						true,
						true
				  )) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: false })
				: (this.client.channels.cache.get(
						GtextChannel
				  ) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: false });
		else if (newState.channelID === GvoiceChannel && oldState.channelID !== GvoiceChannel)
			!this.client.channels.cache.has(GtextChannel)
				? ((await this.client.channels.fetch(
						GtextChannel,
						true,
						true
				  )) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: true })
				: (this.client.channels.cache.get(
						GtextChannel
				  ) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: true });
	}
}
