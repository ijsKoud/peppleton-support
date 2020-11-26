import { guildId } from '../../../config/config';
import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/client';

export default class ReadyEvent extends BaseEvent {
  constructor() {
    super('ready');
  }
  async run (client: DiscordClient) {
    const guild = await client.guilds.fetch(guildId);
    const valid = guild.channels.cache.filter(c => c.name.endsWith('-ticket'));
    valid.forEach(c => client.openTickets.set(c.name.slice(0, -7), true));

    console.log(`${client.user.tag} has logged in!`);
    client.user.setActivity('your support tickets!', { type: 'LISTENING' });
  }
}