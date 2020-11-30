import { eventsTextChannel, eventsVoiceChannel } from '../../config/config';
import { VoiceState, TextChannel } from 'discord.js';
import BaseEvent from '../utils/structures/BaseEvent';
import DiscordClient from '../client/client';

export default class voiceStateUpdateEvent extends BaseEvent {
  constructor() {
    super('voiceStateUpdate');
  }
  
  async run(client: DiscordClient, oldState: VoiceState, newState: VoiceState) {
    if (
      (oldState.channel && !newState.channel) 
      && (oldState.channelID === eventsVoiceChannel 
        && newState.channelID !== eventsVoiceChannel)
    ) {
      !client.channels.cache.has(eventsTextChannel) ? 
      (await client.channels.fetch(eventsTextChannel, true, true) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: false })
      : (client.channels.cache.get(eventsTextChannel) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: false });
    }

    if (
      (!oldState.channel && newState.channel) 
      && (oldState.channelID !== eventsVoiceChannel 
        && newState.channelID == eventsVoiceChannel)
    ) {
      !client.channels.cache.has(eventsTextChannel) ? 
      (await client.channels.fetch(eventsTextChannel, true, true) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: true })
      : (client.channels.cache.get(eventsTextChannel) as TextChannel).updateOverwrite(oldState.member, { VIEW_CHANNEL: true });
    }
  }
}