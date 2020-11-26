import { eventNotification, reactionRoleMSG, reactionEmojiName } from '../../config/config';
import { MessageReaction, User } from 'discord.js';
import BaseEvent from '../utils/structures/BaseEvent';
import DiscordClient from '../client/client';

export default class MessageReactionRemoveEvent extends BaseEvent {
  constructor() {
    super('messageReactionRemove');
  }
  
  async run(client: DiscordClient, reaction: MessageReaction, user: User) {
    try {
      if (reaction.partial) await reaction.fetch();
    
      const message = reaction.message;
      if (message.partial) await message.fetch(true);
      if (user.partial) await user.fetch(true);
      if (user.bot) return;
  
      if (message.id !== reactionRoleMSG) return;
  
      const member = message.guild.members.cache.get(user.id);
  
      switch (reaction.emoji.name) {
        case reactionEmojiName:
          const role = message.guild.roles.cache.get(eventNotification);
          member.roles.remove(role);
          return user.send(`> 🔕 | I took away the **${role.name}** role!`);
      }
    } catch (e) {
      return;
    }
  }
}