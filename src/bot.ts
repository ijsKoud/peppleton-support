import { config } from 'dotenv';
config();
import { registerCommands, registerEvents } from './utils/registry';
import utils from './utils/functions/utils';
import DiscordClient from './client/client';
const client = new DiscordClient({ disableMentions: 'everyone', partials: ['MESSAGE', 'REACTION', 'USER', 'CHANNEL', 'GUILD_MEMBER'] });

(async () => {
  client.timeouts = new Map<string, NodeJS.Timeout>();
  client.spamFilter = new Map<string, number>();
  client.openTickets = new Map<string, boolean>();

  client.prefix = process.env.DISCORD_BOT_PREFIX || client.prefix;

  client.utils = new utils();
  client.tickets = true;

  await registerCommands(client, '../commands');
  await registerEvents(client, '../events');
  await client.login(process.env.DISCORD_BOT_TOKEN);
})();

declare module 'discord.js' {
  interface Client {
    utils: utils;
    tickets: boolean;
    openTickets: Map<string, boolean>;
    spamFilter: Map<string, number>;
    timeouts: Map<string, NodeJS.Timeout>;
  }
}

