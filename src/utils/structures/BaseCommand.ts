import { Message } from 'discord.js';
import DiscordClient from '../../client/client';

interface Options {
  description: string,
  usage: string,
  ownerOnly: boolean,
};

export default abstract class BaseCommand {
  constructor(private name: string, private category: string, private aliases: Array<string>, private options: Options) {}

  getName(): string { return this.name; }
  getCategory(): string { return this.category; }
  getAliases(): Array<string> { return this.aliases; }
  getOptions(): Options { return this.options };

  abstract run(client: DiscordClient, message: Message, args: Array<string> | null);
}