import { Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/client';

export default class TicketsCommand extends BaseCommand {
  constructor() {
    super('tickets', 'Tickets', [], {
      description: "Turn tickets on or off",
      usage: "",
      ownerOnly: false,
    });
  }

  async run(client: DiscordClient, message: Message, args: Array<string>) {
    client.tickets = !client.tickets;
    return message.channel.send(`> ✅ | Tickets are now turned \`${client.tickets ? "on" : "off"}\`!`);
  }
}