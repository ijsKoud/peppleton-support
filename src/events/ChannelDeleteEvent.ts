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

    const reason = client.activeTickets.get(ticketChannel.id).reason;

    const userId = ticketChannel.name.slice(0, -7);
    let user: User;
    try {
      user = await client.users.fetch(userId);
    } catch (e) { }

    try {
      reason === "inactive" 
      ? user.send("> 🕐 | Your ticket has been closed automatically for being inactive for 24 hours. \n > ❓ | Need more support? Open another ticket!")
      : user.send(`> 👍 | Your ticket is now closed, thanks for getting in touch! \n > ❓ | Questions? Don't hesitate to contact us again, we are always happy to help!`);
    } catch (e) { }
    
    client.activeTickets.delete(ticketChannel.id);
    return client.openTickets.delete(userId);
  }
}
