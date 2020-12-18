import { config } from 'dotenv';
config();
import { registerCommands, registerEvents } from './utils/registry';
import { eventNotification } from "../config/config";
import utils from './utils/functions/utils';
import DiscordClient from './client/client';
import mongoose from "mongoose";

const client = new DiscordClient({ 
  allowedMentions: { 
    roles: [eventNotification] 
  }, partials: ['MESSAGE', 'REACTION', 'USER', 'CHANNEL', 'GUILD_MEMBER'],
});

(async () => {
  client.timeouts = new Map<string, NodeJS.Timeout>();
  client.spamFilter = new Map<string, number>();
  client.openTickets = new Map<string, boolean>();
  client.activeTickets = new Map<string, { reason: string, lastMsg: number }>();

  client.prefix = process.env.DISCORD_BOT_PREFIX || client.prefix;

  client.utils = new utils();
  client.tickets = true;

  await registerCommands(client, '../commands');
  await registerEvents(client, '../events');

  mongoose.connect(process.env.DB_URL, { 
    useUnifiedTopology: true, 
    useNewUrlParser: true, 
    useFindAndModify: false,
    useCreateIndex: true,
  });
  
  client.login(process.env.DISCORD_BOT_TOKEN);

  mongoose.connection.on("connected" , () => console.log("connected to database!"));
  mongoose.connection.on("err" , (err: Error) => console.error(`Mongoose Error:\n ${err.stack ? err.stack : err.name} | ${err.message}`));
  mongoose.connection.on("disconnected" , () => console.warn("Database connection lost!"));
})();

declare module 'discord.js' {
  interface Client {
    utils: utils;
    tickets: boolean;
    openTickets: Map<string, boolean>;
    spamFilter: Map<string, number>;
    timeouts: Map<string, NodeJS.Timeout>;
    activeTickets: Map<string, { reason: string, lastMsg: number }>;
  }
}

