import { guildId } from '../../../config/config';
import BaseEvent from '../../utils/structures/BaseEvent';
import { Message, Collection, TextChannel, MessageAttachment } from 'discord.js';
import DiscordClient from '../../client/client';

const spamFilter = new Map<string, boolean>();

export default class ticketChatEvent extends BaseEvent {
  constructor() {
    super('ticketChat');
  }

  async run(client: DiscordClient, message: Message) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild.available) return message.author.send(
      `> 🔥 | The server is on fire!!! Not literally but I can not contact it now, please try again later.`
    );
    
    if (message.content.startsWith(client.prefix)) return this.handleCommands(client, message);
    if (spamFilter.has(message.author.id)) return;

    if (message.channel.type === 'dm') {
      try {
        const channel = guild.channels.cache.find(c => c.name === `${message.author.id}-ticket`) as TextChannel;
        if (!channel) return;

        const files = this.getAttachments(message.attachments);
        const content = message.content.length
        ? message.content.length > 1500 ? message.content.substr(0, 1500 -3) + '...' : message.content
        : 'No message content.';

        channel.send(`> 💬 | Reply from ${message.author.toString()}: \`\`\`${content}\`\`\`\n > ❓ | To reply send a message to ${channel.toString()}. \n > Use \`${client.prefix}\` if you don't want to respond with a message. \n > Check the command list for all the commands available for tickets!`, {
          files
        });

        spamFilter.set(message.author.id, true);
        setTimeout(() => spamFilter.delete(message.author.id));

        return message.react('✅');
      } catch (e) {
        message.react('❌');
        return message.author.send(`> ❗ | Oh no, this shouldn't happen: \n\`\`\`\n${e}\n\`\`\``);
      }
    } else if (message.channel.type === 'text') {
      try {
        const userId = message.channel.name.slice(0, -7);
        const user = client.users.cache.get(userId) ? (client.users.cache.get(userId).partial ? await client.users.fetch(userId) : client.users.cache.get(userId)) : undefined;
        if (!user) return message.channel.send(
          `> ❌ | I was not able to find this user, please check if they are in the server. If not you can close this ticket!`
        );
        const channel = await user.createDM();
        if (!channel) return;
        
        if (!message.channel.topic.includes(message.author.id)) return;
        const files = this.getAttachments(message.attachments);
        const content = message.content.length
        ? message.content.length > 1500 ? message.content.substr(0, 1500 -3) + '...' : message.content
        : 'No message content.';

        channel.send(`> 💬 | Reply from **${message.member.nickname || message.author.username}**: \`\`\`${content}\`\`\`\n > ❓ | To reply send a message to me. \n > Use \`${client.prefix}\` if you don't want to respond with a message. \n > Check the command list for all the commands available for tickets!`, {
          files
        });

        spamFilter.set(message.author.id, true);
        setTimeout(() => spamFilter.delete(message.author.id));
        
        return message.react('✅');
      } catch (e) {
        message.react('❌');
        return message.author.send(`> ❗ | Oh no, this shouldn't happen: \n\`\`\`\n${e}\n\`\`\``);
      }
    }
  };

  getAttachments(attachments: Collection<string, MessageAttachment>): string[] {
    const valid = /^.*(gif|png|jpg|jpeg|mp4|mp3|pdf|psd)$/g

    return attachments.array()
      .filter(attachment => valid.test(attachment.url))
      .map(attachment => attachment.url);
  }

  handleCommands(client: DiscordClient, message: Message) {
    const [cmdName, ...cmdArgs] = message.content
      .slice(client.prefix.length)
      .trim()
      .split(/\s+/);
    const command = client.commands.get(cmdName);
    if (command) {
      command.run(client, message, cmdArgs);
    }
  }
}