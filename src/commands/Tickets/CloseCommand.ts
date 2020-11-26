import { Message, TextChannel } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/client';

export default class CloseCommand extends BaseCommand {
  constructor() {
    super('close', 'Tickets', [], {
      description: 'Closes a ticket, very simple right?',
      usage: '',
      ownerOnly: false,
    });
  }

  async run(client: DiscordClient, message: Message, args: Array<string>) {
    if (message.channel.type == 'dm') return message.channel.send(
      `> ❌ | This command is only usable in a ticket channel. If you wish to close a ticket, ask the ticket claimer to close it.`
    );

    const channel = message.channel as TextChannel;
    if (!channel.name.endsWith('-ticket')) return message.channel.send(
      `> ❌ | This command is only usable in a ticket channel.`
    );
    if (!channel.topic.includes(message.author.id)) return message.channel.send(
      `> ❌ | Only ticket owners can execute this command.`
    );

    try {
      channel.delete();
      return message.author.send(`> ✅ | Successfully closed: **${channel.name}**.`);
    } catch (e) { }
  }
}