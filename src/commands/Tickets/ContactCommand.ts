import { Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/client';
import { categoryId } from "../../../config/config";

export default class ContactCommand extends BaseCommand {
  constructor() {
    super('contact', 'Tickets', [], {
      description: 'Contact a user and open a ticket with them.',
      usage: '<user id/tag/username/mention> <reason>',
      ownerOnly: false,
    });
  }

  async run(client: DiscordClient, message: Message, args: Array<string>) {
    if (!message.guild) return;

    const user = client.utils.filterMember(message, args[0]);
    const reason = args.slice(1).join(" ");

    if (!user) return message.channel.send(
      `> 🔎 | Unkown user, please check if you copied the right ID or if you spelled their name correctly.`
    );
    if (!reason) return message.channel.send(
      "> ❌ | No reason specified. Please provide a reason why you want to contact this user."
    );

    if (client.openTickets.has(user.user.id)) return message.react("❌");

    try {
      user.user.send(`> 🎫 | A new ticket is created by **${message.member.nickname || message.author.username}**. The reason to contact you is: **${reason.replace(/\`/g, "").replace(/\*/g, "")}** \n > ❓ | Send a message to respond to this ticket.`);

      const ticketChannel = await message.guild.channels.create(`${user.user.id}-ticket`, {
        type: 'text',
        topic: `${message.author.id}| Do not edit this channel. If you edit it you might break the system!`,
        parent: categoryId,
      });

      await ticketChannel.updateOverwrite(message.guild.id, { SEND_MESSAGES: false, VIEW_CHANNEL: false });
      await ticketChannel.updateOverwrite(message.author, { SEND_MESSAGES: false, VIEW_CHANNEL: false });
      await ticketChannel.updateOverwrite(user, { SEND_MESSAGES: true, VIEW_CHANNEL: true, ATTACH_FILES: true });
      await ticketChannel.updateOverwrite('304986851310043136', { SEND_MESSAGES: true, VIEW_CHANNEL: true, ATTACH_FILES: true });

      ticketChannel.send(`> ℹ | This ticket was opened by ${message.author.toString()} for ${user.user.toString()} about **${reason.replace(/\`/g, "").replace(/\*/g, "")}**.`);

      return message.react("✅");
    } catch (e) {
      return message.channel.deleted ? "" : message.channel.send(`> ❗ | Oh no, this shouldn't happen: \n\`\`\`\n${e}\n\`\`\`\n This is 9/10 times because the user closed their DMs.`);
    }
  }
}