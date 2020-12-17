import { 
  blacklistRole, 
  guildId, 
  qdEmoji, 
  dsEmoji, 
  gdEmoji, 
  prEmoji, 
  categoryId, 
  qdDepChannel, 
  dsDepChannel, 
  gdDepChannel, 
  anyDepChannel,
  suggestionsChannel,
} from '../../../config/config';
import BaseEvent from '../../utils/structures/BaseEvent';
import { Message, GuildMember, MessageEmbed,MessageReaction, User, Collection } from 'discord.js';
import DiscordClient from '../../client/client';
import { MessageAttachment } from 'discord.js';
import { Guild } from 'discord.js';
import { TextChannel } from 'discord.js';

const timeouts = new Map<string, boolean>();

export default class dmEvent extends BaseEvent {
  constructor() {
    super('dm');
  }

  async run(client: DiscordClient, message: Message) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild.available) return message.author.send(
      `> 🔥 | The server is on fire!!! Not literally but I can not contact it now, please try again later.`
    );

    try {
      const emojiFilter = (reaction: MessageReaction, user: User) => {
        return user.id === message.author.id && emojiNames.includes(reaction.emoji.name);
      };
      const filter = (m: Message) => {
        return m.author.id === message.author.id;
      };

      const selectorFilter = (reaction: MessageReaction, user: User) => {
        return user.id === message.author.id && ["1️⃣", "2️⃣"].includes(reaction.emoji.name);
      };

      const member = guild.members.cache.get(message.author.id).partial ? await guild.members.fetch(message.author.id) : guild.members.cache.get(message.author.id);
      const dmChannel = await member.createDM();
      let cancelled: boolean = false;
      let department: string = '';
      let title: string = '';
      let description: string = '';
      let extra: string = '';
      let fileUrls: string[] = [];

      let types: string[] = ['department', 'title', 'description', 'extra'];
      let emojis: string[] = [qdEmoji, dsEmoji, gdEmoji, prEmoji];
      let emojiNames: string[] = ['QD', 'DS', 'GD', 'PRLogo'];

      if (!this.clean(member)) return dmChannel.send(
        `> 🔨 | You are blacklisted from using the tickets system, you can not open a ticket until you are removed from the blacklist. If you think this is a mistake feel free to DM a staff member about this.`
      );

      try {
        const embed = new MessageEmbed()
        .setAuthor("Select one of the options to continue", client.user.displayAvatarURL({ dynamic: true, size: 4096 }))
        .setDescription("1️⃣ Open a ticket. \n 2️⃣ Make a suggestion.")
        .setFooter("This prompt will close in 60 seconds")
        .setColor("#061A29")
        const msg = await dmChannel.send(embed);
        ["1️⃣", "2️⃣"].forEach(emoji => msg.react(emoji));

        const collector = await msg.awaitReactions(selectorFilter, { time: 6e4, max: 1, errors: ["time"] }).catch(e => new Collection<string, MessageReaction>());
        if (!collector.size || !["1️⃣", "2️⃣"].includes(collector.first().emoji.name)) return msg.delete();

        if (collector.first().emoji.name === "2️⃣") {
          if (timeouts.has(message.author.id)) return message.channel.send("> ❌ | There is a `5` seconds cooldown on this action. Please try again later.");

          const sgMsg = await dmChannel.send(`> ❓ | What is your suggestion? Please give as much detail as possible.`);
          ["1️⃣", "2️⃣"].forEach(emoji => msg.react(emoji));
  
          const collector = await sgMsg.channel.awaitMessages(filter, { time: 12e4, max: 1, errors: ["time"] }).catch(e => new Collection<string, Message>());
          if (!collector.size) return msg.edit("> ❌ | Prompt cancelled");

          const suggestions = (guild.channels.cache.get(suggestionsChannel) || await client.channels.fetch(suggestionsChannel, true)) as TextChannel;
          suggestions.send(`> ${prEmoji} | New suggestion - **${message.author.tag}**: \`\`\` ${collector.first().content.replace(/\`/g, "")} \`\`\``, { split: true });

          timeouts.set(message.author.id, true);
          setTimeout(() => timeouts.delete(message.author.id), 5e3);
          
          return dmChannel.send(`> ${prEmoji} | New suggestion - **${message.author.tag}**: \`\`\` ${collector.first().content.replace(/\`/g, "")} \`\`\` \n > ❗ | Misusing will result in a suggestion blacklist.`, { split: true });
        };
      } catch (e) {
        console.log(e);
        return message.channel.send("> ⚠ | Oops, It looks like your DMs are not open. Enable them so I can send you a DM. \n > ℹ | If you think I am wrong, please ping DaanGamesDG and he will help you.");
      }

      if (!client.tickets) return dmChannel.send(
        `> 🔒 | Sorry, the tickets are currently closed. Come back later to see if they are opened again.`
      );
      if (client.openTickets.has(message.author.id)) return message.author.send(
        `> ❗ | A ticket is already opened for you, please wait until the ticket is closed!`
      );

      for await (const type of types) {
        if (cancelled) return;
        switch (type) {
          case 'department':
            const embed = new MessageEmbed()
            .setAuthor('Select a department to continue:', client.user.displayAvatarURL({ dynamic: true, size: 4096 }))
            .setColor('#061A29')
            .setDescription([
              'Is your question related to a **role**? \n If not, select `any department`! \n',
              `> ${qdEmoji} | **QD Department**`,
              `> ${dsEmoji} | **DS Department**`,
              `> ${gdEmoji} | **GD Department**`,
              `> ${prEmoji} | **Any Department** \n`,
              'React to an emoji below to continue. \n This prompt will close in `60` seconds!'
            ]);

            const depMsg = await dmChannel.send(embed);
            for (const emoji of emojis) depMsg.react(emoji);
            const depCollector = await depMsg.awaitReactions(emojiFilter, { time: 6e4, max: 1, errors: ['time'] }).catch(e => new Collection<string, MessageReaction>());
            if (!depCollector.size) {
              cancelled = true;
              depMsg.delete();
              return dmChannel.send(`> ❌ | The prompt is cancelled.`);
            };
            
            switch (depCollector.first().emoji.name) {
              case emojiNames[0]:
                department = 'Driver Department';
                depMsg.delete();
                dmChannel.send(`> ${qdEmoji} | You selected the **${department}**.`);
                break;
              case emojiNames[1]:
                department = 'Dispatch Department';
                depMsg.delete();
                dmChannel.send(`> ${dsEmoji} | You selected the **${department}**.`);
                break;
              case emojiNames[2]:
                department = 'Guard Department';
                depMsg.delete();
                dmChannel.send(`> ${gdEmoji} | You selected the **${department}**.`);
                break;
              case emojiNames[3]:
                department = 'Any Department';
                depMsg.delete();
                dmChannel.send(`> ${prEmoji} | You selected the **${department}**.`);
                break;
            }
            break;
          case 'title':
            const titleMsg = await dmChannel.send(
              `> 📝 | What is the title/topic of your question? You do not have to describe your question here, you can do that in the next part.`
            );
            const titleCollector = await dmChannel.awaitMessages(filter, { time: 6e4, max: 1, errors: ['time'] }).catch(e => new Collection<string, Message>());
            if (!titleCollector.size) {
              cancelled = true;
              return titleMsg.edit(`> ❌ | The prompt is cancelled.`);
            };
            title = titleCollector.first().content;
            titleMsg.edit(`> 📁 | You answered: \`${title.length > 1800 ? title.substr(0, 1800 - 3) + '...' : title}\`.`);
            break;
          case 'description':
            const descMsg = await dmChannel.send(
              `> 📝 | Explain your question. In the next step you can add message attachements to support your description.`
            );
            const descCollector = await dmChannel.awaitMessages(filter, { time: 12e4, max: 1, errors: ['time'] }).catch(e => new Collection<string, Message>());
            if (!descCollector.size) {
              cancelled = true;
              return titleMsg.edit(`> ❌ | The prompt is cancelled.`);
            };
            description = descCollector.first().content;
            descMsg.edit(`> 📁 | You answered: \`${description.length > 1800 ? description.substr(0, 1800 - 3) + '...' : description}\`.`);
            break;
          case 'extra':
            const extraMsg = await dmChannel.send(
              `> 📝 | Add any attachments here, if you don't have them just say something like: \`No attachments\`.`
            );
            const extraCollector = await dmChannel.awaitMessages(filter, { time: 6e4, max: 1, errors: ['time'] }).catch(e => new Collection<string, Message>());
            if (!extraCollector.size) {
              cancelled = true;
              return extraMsg.edit(`> ❌ | The prompt is cancelled.`);
            };
            const files = this.getAttachments(extraCollector.first().attachments);
            extra = extraCollector.first().content;
            await dmChannel.send(`> 📁 | You answered: \`${extra.length > 1800 ? extra.substr(0, 1800 - 3) + '...' : extra}\`.`, {
              files
            });
            extra = extraCollector.first().content;
            fileUrls = files;
            break;
        };
      };

      title ? title : 'Unkown Title';
      extra ? extra : 'Unkown extra';
      description ? description : 'Unkown Description';
      const embed = new MessageEmbed()
      .setTitle('Your ticket is created - support will be with you shortly!')
      .setDescription([
        `> ${prEmoji} | **Department**: ${department}`,
        `> 🏷 | **Title/topic**: ${title.length > 200 ? title.substr(0, 200 - 3) + '...' : title}`,
        `> 📄 | **Description**: ${description.length > 200 ? description.substr(0, 200 - 3) + '...' : description}`,
        `> 📂 | **Extra**: ${extra.length > 400 ? extra.substr(0, 400 - 3) + '...' : extra}`,
      ])
      .addField('Files', fileUrls.map(url => url).join(' ').substr(0, 1024) || 'No attachments')
      .setColor('#061A29')
      dmChannel.send(embed);
      client.openTickets.set(message.author.id, true);
      return this.claimingSystem(client, message, guild, department, title, description, extra, fileUrls);
    } catch (e) {
      client.openTickets.delete(message.author.id);
      console.log(e);
      return message.channel.send(
        `> ❗ | Oh no, this shouldn't happen: \n\`\`\`\n${e}\n\`\`\``
      ).catch(e => null);
    }
  };

  clean(member: GuildMember): boolean {
    return member.roles.cache.has(blacklistRole)
    ? false
    : true;
  };

  getAttachments(attachments: Collection<string, MessageAttachment>): string[] {
    const valid = /^.*(gif|png|jpg|jpeg|mp4|mp3|pdf|psd)$/g

    return attachments.array()
      .filter(attachment => valid.test(attachment.url))
      .map(attachment => attachment.url);
  }

  async claimingSystem(client: DiscordClient, message: Message, guild: Guild, dep: string, title: string, description: string, extra: string, files: string[]) {
    const filter = (reaction: MessageReaction, user: User) => {
      return !user.bot && ['✅'].includes(reaction.emoji.name);
    };

    const channelId = 
      dep == 'Driver Department'
      ? qdDepChannel
      : dep == 'Dispatch Department'
        ? dsDepChannel
        : dep == 'Guard Department'
          ? gdDepChannel
          : anyDepChannel;
    const channel = guild.channels.cache.get(channelId) as TextChannel;
    if (!channel) return console.log('No ticket channel found for ' + channelId);

    try {
      const embed = new MessageEmbed()
        .setTitle(`A new ticket is opened by ${message.author.tag}`)
        .setDescription([
          `> ${prEmoji} | **Department**: ${dep}`,
          `> 🏷 | **Title/topic**: ${title.length > 200 ? title.substr(0, 200 - 3) + '...' : title}`,
          `> 📄 | **Description**: ${description.length > 200 ? description.substr(0, 200 - 3) + '...' : description}`,
          `> 📂 | **Extra**: ${extra.length > 400 ? extra.substr(0, 400 - 3) + '...' : extra}`,
          `> 📞 | **Claimed by**: unclaimed`,
          `> 👤 | **User**: ${message.author.toString()}`
        ])
        .addField('Files', files.map(url => url).join(' ').substr(0, 1024) || 'No attachments')
        .setColor('#061A29')
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 4096 }));
      const msg = await channel.send(embed);
      msg.react('✅');

      const collector = await msg.awaitReactions(filter, { time: 864e5, max: 1, errors: ['time'] }).catch(e => new Collection<string, MessageReaction>());
      if (!collector.size) return client.openTickets.delete(message.author.id) && msg.delete() && message.author.send(
        `> 😢 | No one was able to claim your ticket, open a new one or reach out to a staff member directly!`
      );
      
      const claimerId = collector.first().users.cache.filter(u => u.id !== client.user.id).first().id;
      const claimer = guild.members.cache.get(claimerId);
      const ticketChannel = await guild.channels.create(`${message.author.id}-ticket`, {
        type: 'text',
        topic: `${claimer.id}| Do not edit this channel. If you edit it you might break the system!`,
        parent: categoryId,
      });
      ticketChannel.updateOverwrite(claimer, { SEND_MESSAGES: true, VIEW_CHANNEL: true, ATTACH_FILES: true });
      ticketChannel.updateOverwrite(guild.me, { SEND_MESSAGES: true, VIEW_CHANNEL: true, ATTACH_FILES: true });
      ticketChannel.updateOverwrite(guild.id, { SEND_MESSAGES: false, VIEW_CHANNEL: false });
      ticketChannel.updateOverwrite('304986851310043136', { SEND_MESSAGES: true, VIEW_CHANNEL: true, ATTACH_FILES: true });
      embed.setDescription([
        `> ${prEmoji} | **Department**: ${dep}`,
        `> 🏷 | **Title/topic**: ${title.length > 200 ? title.substr(0, 200 - 3) + '...' : title}`,
        `> 📄 | **Description**: ${description.length > 200 ? description.substr(0, 200 - 3) + '...' : description}`,
        `> 📂 | **Extra**: ${extra.length > 400 ? extra.substr(0, 400 - 3) + '...' : extra}`,
      ])
      msg.delete();
      embed.setTitle(`Ticket opened by ${message.author.tag}`);
      ticketChannel.send(embed);
      message.author.send(`> 👥 | Your ticket is claimed by **${claimer.nickname || claimer.user.username}**, you should receive a response shortly.`);
    } catch (e) {
      client.openTickets.delete(message.author.id);
      message.author.send(`> ❗ | Oh no, this shouldn't happen: \n\`\`\`\n${e}\n\`\`\``);
    }
  }

}