import { guildId } from '../../../config/config';
import BaseEvent from '../../utils/structures/BaseEvent';
import { Message, Collection, TextChannel, MessageAttachment, Util } from 'discord.js';
import DiscordClient from '../../client/client'; 

export default class ticketChatEvent extends BaseEvent {
  constructor() {
    super('ticketChat');
  }

  async run(client: DiscordClient, message: Message) {
    const timeouts = client.timeouts;
    const spamFilter = client.spamFilter;
    const guild = client.guilds.cache.get(guildId);
    if (!guild.available) return message.author.send(
      `> 🔥 | The server is on fire!!! Not literally but I can not contact it now, please try again later.`
    );
    
    if (message.content.startsWith(client.prefix) && !message.content.slice(client.prefix.length).startsWith("message")) return this.handleCommands(client, message);
    if (spamFilter.has(message.author.id) && spamFilter.get(message.author.id) === 5) return;

    if (!timeouts.has(message.author.id)) timeouts.set(message.author.id, setTimeout(() => spamFilter.delete(message.author.id), 4e3));

    spamFilter.has(message.author.id) 
      ? spamFilter.set(message.author.id, spamFilter.get(message.author.id) + 1) 
      : spamFilter.set(message.author.id, 1);

    if (spamFilter.get(message.author.id) >= 5) {
      setTimeout(() => spamFilter.delete(message.author.id), 1e4);
      timeouts.delete(message.author.id);
    };

    if (message.channel.type === 'dm') {
      try {
        const channel = guild.channels.cache.find(c => c.name === `${message.author.id}-ticket`) as TextChannel;
        if (!channel) return;

        const files = this.getAttachments(message.attachments);
        const content = this.clean(
          message.content.length
          ? message.content.length > 1500 
            ? message.content.substr(0, 1500 -3) + '...' 
            : message.content
          : 'No message content.'
        );

        channel.send(`> 💬 | Reply from ${message.author.toString()}: \`\`\`${content}\`\`\`\n > ❓ | Use \`${client.prefix}message <message>\` to respond. \n > Check the command list for all the commands available for tickets!`, {
          files
        });

        client.activeTickets.set(channel.id, { reason: "", lastMsg: Date.now() });

        return message.react('✅');
      } catch (e) {
        message.react('❌');
        return message.author.send(`> ❗ | Oh no, this shouldn't happen: \n\`\`\`\n${e}\n\`\`\``);
      }
    } else if (message.channel.type === 'text') {
      try {
        if (!message.content.startsWith(client.prefix + "message")) return;
        const userId = message.channel.name.slice(0, -7);
        const user = client.users.cache.get(userId) ? (client.users.cache.get(userId).partial ? await client.users.fetch(userId) : client.users.cache.get(userId)) : undefined;
        if (!user) return message.channel.send(
          `> ❌ | I was not able to find this user, please check if they are in the server. If not you can close this ticket!`
        );
        const channel = await user.createDM();
        if (!channel) return;
        
        if (!message.channel.topic.includes(message.author.id)) return;
        const files = this.getAttachments(message.attachments);
        const content = this.clean(
          message.content.length
          ? message.content.length > 1500 
            ? message.content.slice(client.prefix.length + "message ".length).substr(0, 1500 -3) + '...'
            : message.content.slice(client.prefix.length + "message ".length)
          : 'No message content.'
        );

        if ((!message.content || message.content.length < 0) && !files.length) return;

        channel.send(`> 💬 | Reply from **${message.member.nickname || message.author.username}**: \`\`\`${content}\`\`\`\n > ❓ | To reply send a message to me. \n > Use \`${client.prefix}\` if you don't want to respond with a message. \n > Check the command list for all the commands available for tickets!`, {
          files
        });

        client.activeTickets.set(message.channel.id, { reason: "", lastMsg: Date.now() });

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

  clean(text: string): string {
    return text.replace(/\`/g, "");
  }
}
