import { DMChannel, GuildChannel, TextChannel, User } from 'discord.js';
import BaseEvent from '../utils/structures/BaseEvent';
import DiscordClient from '../client/client';

export default class ChannelDeleteEvent extends BaseEvent {
  constructor() {
    super('channelDelete');
  }
  
  async run(client: DiscordClient, channel: DMChannel | GuildChannel) {
    const ticketChannel = channel as TextChannel
    if (!ticketChannel.name.endsWith('-ticket')) return;

    const userId = ticketChannel.name.slice(0, -7);
    let user: User;
    try {
      user = await client.users.fetch(userId);
    } catch (e) { }

    try {
      user.send(`> 👍 | Your ticket is now closed, thanks for getting in touch! \n > ❓ | Questions? Don't hesitate to contact us again, we are always happy to help!`);
    } catch (e) { }
    return client.openTickets.delete(ticketChannel.name.slice(0, -7));
  }
}
