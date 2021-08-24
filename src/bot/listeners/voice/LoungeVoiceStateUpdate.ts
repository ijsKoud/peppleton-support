import { Listener, ListenerOptions } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { TextChannel, VoiceState } from "discord.js";

@ApplyOptions<ListenerOptions>({ event: "voiceStateUpdate" })
export default class LoungeVoiceStateUpdateListener extends Listener {
	public async run(oldState: VoiceState, newState: VoiceState): Promise<void> {
		const { client } = this.container;
		const { GvoiceChannel, GtextChannel } = client.constants.voice;
		const { manager, botDev } = client.constants.departments;

		if (!oldState.member || oldState.member.user.bot) return;
		if (oldState.member.partial) await oldState.member.fetch();

		if (oldState.member.roles.cache.has(botDev) || oldState.member.roles.cache.has(manager)) return;
		if (newState.channelId !== GvoiceChannel && oldState.channelId === GvoiceChannel)
			!client.channels.cache.has(GtextChannel)
				? ((await client.channels.fetch(GtextChannel)) as TextChannel).permissionOverwrites.create(
						oldState.member,
						{ VIEW_CHANNEL: false }
				  )
				: (client.channels.cache.get(GtextChannel) as TextChannel).permissionOverwrites.create(
						oldState.member,
						{ VIEW_CHANNEL: false }
				  );
		else if (newState.channelId === GvoiceChannel && oldState.channelId !== GvoiceChannel)
			!client.channels.cache.has(GtextChannel)
				? ((await client.channels.fetch(GtextChannel)) as TextChannel).permissionOverwrites.create(
						oldState.member,
						{ VIEW_CHANNEL: true }
				  )
				: (client.channels.cache.get(GtextChannel) as TextChannel).permissionOverwrites.create(
						oldState.member,
						{ VIEW_CHANNEL: true }
				  );
	}
}
