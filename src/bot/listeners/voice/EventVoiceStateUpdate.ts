import { Listener, ListenerOptions } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { TextChannel, VoiceState } from "discord.js";

@ApplyOptions<ListenerOptions>({ event: "voiceStateUpdate" })
export default class EventVoiceStateUpdateListener extends Listener {
	public async run(oldState: VoiceState, newState: VoiceState): Promise<void> {
		const { client } = this.container;
		const { eventsRole, EvoiceChannel, EtextChannel } = client.constants.voice;

		if (!oldState.member || oldState.member.user.bot) return;
		if (oldState.member.partial) await oldState.member.fetch();

		if (oldState.member.roles.cache.has(eventsRole)) return;
		if (newState.channelId !== EvoiceChannel && oldState.channelId === EvoiceChannel)
			!client.channels.cache.has(EtextChannel)
				? ((await client.channels.fetch(EtextChannel)) as TextChannel).permissionOverwrites.create(
						oldState.member,
						{ VIEW_CHANNEL: false }
				  )
				: (client.channels.cache.get(EtextChannel) as TextChannel).permissionOverwrites.create(
						oldState.member,
						{ VIEW_CHANNEL: false }
				  );
		else if (newState.channelId === EvoiceChannel && oldState.channelId !== EvoiceChannel)
			!client.channels.cache.has(EtextChannel)
				? ((await client.channels.fetch(EtextChannel)) as TextChannel).permissionOverwrites.create(
						oldState.member,
						{ VIEW_CHANNEL: true }
				  )
				: (client.channels.cache.get(EtextChannel) as TextChannel).permissionOverwrites.create(
						oldState.member,
						{ VIEW_CHANNEL: true }
				  );
	}
}
