import { guildId } from '../../../config/config';
import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/client';
import { TextChannel } from "discord.js";

export default class ReadyEvent extends BaseEvent {
  constructor() {
    super('ready');
  }
  async run (client: DiscordClient) {
    const guild = await client.guilds.fetch(guildId);
    const valid = guild.channels.cache.filter(c => c.name.endsWith('-ticket'));
    valid.forEach(c => client.openTickets.set(c.name.slice(0, -7), true));
    valid.forEach(c => 
      client.activeTickets.set(c.id, { reason: "", lastMsg: (c as TextChannel).lastMessage.createdTimestamp })
    );

    setInterval(() => {
      client.activeTickets.forEach(async (v, k) => {
        (Date.now() - v.lastMsg) >= 864e5 /* 5e3 */
        ? client.activeTickets.set(k, { reason: "inactive", lastMsg: v.lastMsg }) 
          && (client.channels.cache.get(k) || await client.channels.fetch(k)).delete()
        : "";
      })
    }, 1e3);

    console.log(`${client.user.tag} has logged in!`);
    client.user.setActivity('your support tickets!', { type: 'LISTENING' });
  }
}