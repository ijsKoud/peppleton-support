import { Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import { blacklistRole } from "../../../config/config";
import DiscordClient from '../../client/client';
import ms from "ms";

export default class BlacklistCommand extends BaseCommand {
  constructor() {
    super('blacklist', 'Tickets', ["bl"], {
      description: 'Blacklists a user, amazing right?',
      usage: '<user id/tag/username/mention> <duration, ex: 2m> [reason]',
      ownerOnly: false,
    });
  }

  async run(client: DiscordClient, message: Message, args: Array<string>) {
    if (message.channel.type === "dm") return;
    const user = client.utils.filterMember(message, args[0] || "");
    const duration = ms(args[1]);
    const reason = args.slice(2).join(" ");
    let dmed: boolean = true;

    if (!user || !duration || isNaN(duration)) 
      return message.channel.send("> ❌ | Unkown user or incorrect duration. example: `=blacklist DaanGamesDG 2m abusing ticket system`.");
    
    user.send(`> 🔨 | You are blacklisted from using the ticket system for **${ms(duration)}** with the reason **${reason || "No reason given"}**`)
      .catch(e => dmed = false);
    
    user.roles.add(blacklistRole);
    setTimeout(() => user.roles.remove(blacklistRole), duration);

    return message.channel.send(`> ✅ | Successfully blacklisted ${user.toString()} for **${ms(duration)}**. ${dmed ? "" : "I was not able to DM this user."}`);
  }
}