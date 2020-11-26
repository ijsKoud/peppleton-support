import { Message, MessageEmbed } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/client';

export default class HelpCommand extends BaseCommand {
  constructor() {
    super('help', 'Information', [], {
      description: 'Uhm, you should know that right?',
      usage: '',
      ownerOnly: false,
    });
  }

  async run(client: DiscordClient, message: Message, args: Array<string>) {
    const embed = new MessageEmbed()
    .setColor(message.member ? message.member.displayHexColor : 'BLUE')
    .setTitle(`Help menu for ${message.author.tag}`)
    client.cs.forEach(c => {
      embed.fields.length < 25
      ? embed.addField(c.getName(), `Description: ${c.getOptions().description} \n Usage: \`${c.getName()} ${c.getOptions().usage}\` \n OwnerOnly: ${c.getOptions().ownerOnly}`)
      : '';
    });
    return message.channel.send(embed);
  }
}