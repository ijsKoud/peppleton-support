import {
  qdDepChannel, 
  dsDepChannel, 
  gdDepChannel, 
  anyDepChannel 
} from '../../../config/config';
import { Message, TextChannel, MessageReaction, User, Collection } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/client';

export default class TransferCommand extends BaseCommand {
  constructor() {
    super('transfer', 'Tickets', [], {
      description: 'Transfers a ticket to a different department/user.',
      usage: '<user id | department name>',
      ownerOnly: false,
    });
  }

  async run(client: DiscordClient, message: Message, args: Array<string>) {
    if (message.channel.type == 'dm') return message.channel.send(
      `> ❌ | This command is only usable in a ticket channel. If you wish to transfer a ticket to a different department, ask the ticket claimer to transfer it.`
    );

    const type: string = isNaN(parseInt(args[0])) ? "department" : "user";

    if (!message.channel.name.endsWith('-ticket') || message.channel.topic.split('|')[0] !== message.author.id) return message.channel.send(
      `> ❌ | This is not your ticket, ticket claimers are the only one that can do this.`
    )

    switch (type) {
      case 'department':
        const dep = this.department((args[0] || '').toLowerCase());
        if (!dep) return message.channel.send(
          `> ❗ | Unkown department. Valid departments: \`QD\`, \`DS\`, \`GD\`, \`any\`.`
        );
        this.handleDepartment(client, message, dep);
        return message.channel.send(
          `> ✅ | Ticket is transferred to a different department, you will remain as claimer until someone from a different department claims this ticket.`
        ); 
      case 'user':
        const user = client.utils.filterMember(message, args[0]);
        const opener = message.guild.members.cache.get(message.channel.name.slice(0, -7));
        if (!user) return message.channel.send(
          `> 🔎 | Unkown user, please check if you copied the right ID or if you spelled their name correctly.`
        );

        try {
          await message.channel.setTopic(`${user.id}| Do not edit this channel. If you edit it you might break the system!`, `Ticket transfered to ${user.user.tag} from ${message.author.tag}`);
          await message.channel.updateOverwrite(message.author, { SEND_MESSAGES: false, VIEW_CHANNEL: false });
          await message.channel.updateOverwrite(user, { SEND_MESSAGES: true, VIEW_CHANNEL: true, ATTACH_FILES: true });
          await message.channel.updateOverwrite('304986851310043136', { SEND_MESSAGES: true, VIEW_CHANNEL: true, ATTACH_FILES: true });

          opener ? opener.send(`> ⤴ | Your ticket is transferred to ${user.toString()}, you should receive a response shortly.`) : '';
          user.send(`> 📨 | ${message.author.toString()} transferred ${message.channel.toString()} to you, ${opener.toString()} is waiting on a response. Send a message to the chat to start.`);
          

          return message.author.send(`> ✅ | The ticket is transferred to ${user.toString()}!`);
        } catch (e) {
          return message.channel.deleted ? '' : message.channel.send(`> ❗ | Oh no, this shouldn't happen: \n\`\`\`\n${e}\n\`\`\``);
        }
    }
  }

  department(type: string): string {
    type = type.toLowerCase();
    return type == 'qd'
    ? 'Driver Department'
    : type == 'ds'
      ? 'Dispatch Department'
      : type == 'gd'
        ? 'Guard Department'
        : type == 'any'
          ? 'Any Department'
          : undefined;
  }

  async handleDepartment(client: DiscordClient, message: Message, type: string) {
    try {
      await message.guild.fetch();
      const filter = (reaction: MessageReaction, user: User) => {
        return !user.bot && ['📧'].includes(reaction.emoji.name);
      };
      const channel = message.channel as TextChannel;
      const opener = message.guild.members.cache.get(channel.name.slice(0, -7));
      let transferChannel: TextChannel;
  
      switch (type) {
        case 'Driver Department': transferChannel = message.guild.channels.cache.get(qdDepChannel) as TextChannel; break;
        case 'Dispatch Department': transferChannel = message.guild.channels.cache.get(dsDepChannel) as TextChannel; break;
        case 'Guard Department': transferChannel = message.guild.channels.cache.get(gdDepChannel) as TextChannel; break;
        case 'Any Department': transferChannel = message.guild.channels.cache.get(anyDepChannel) as TextChannel; break;
      }
  
      const msg = await transferChannel.send(`> 📨 | **${message.member.nickname || message.author.username}** made a ticket transfer to ${type}, react with \`📧\` to claim this ticket. \n > 👤 | Ticket opener: ${opener.toString()}`);
      msg.react('📧');
  
      const collector = await msg.awaitReactions(filter, { time: 864e5, max: 1, errors: ['time'] }).catch(e => new Collection<string, MessageReaction>());
      if (!collector.size) return msg.delete() && message.author.send(
        `> 😢 | No one from the ${type} was able to claim your ticket, make a new request to try again.`
      );
      
      msg.delete();
      const claimerId = collector.first().users.cache.filter(u => u.id !== client.user.id).first().id;
      const claimer = message.guild.members.cache.get(claimerId);
      const ticketChannel = await channel.edit({ topic: `${claimer.id}| Do not edit this channel. If you edit it you might break the system!` });
      ticketChannel.updateOverwrite(claimer, { SEND_MESSAGES: true, VIEW_CHANNEL: true, ATTACH_FILES: true });
      ticketChannel.updateOverwrite(message.author, { SEND_MESSAGES: false, VIEW_CHANNEL: false, ATTACH_FILES: false });
      ticketChannel.updateOverwrite('304986851310043136', { SEND_MESSAGES: true, VIEW_CHANNEL: true, ATTACH_FILES: true });
  
      message.author.send(`> ✅ | Your ticket is transferred to ${claimer.toString()}!`);
      message.channel.send(`> 👋 | ${claimer.toString()}, send messages to this channel to talk to the ticket opener.`);
      return opener.send(`> 📨 | Your ticket is transferred to the **${type}**, your new claimer is ${claimer.toString()}!`);
    } catch (e) { return message.channel.send(`> ❗ | Oh no, this shouldn't happen: \n\`\`\`\n${e}\n\`\`\``) };
  }
}