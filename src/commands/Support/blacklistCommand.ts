import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class blacklistCommand extends Command {
	constructor() {
		super("blacklist", {
			aliases: ["blacklist"],
			userPermissions: ["KICK_MEMBERS"],
			description: {
				content: "Blacklist a user",
				usage: "blacklist <user> <type> <reason>",
			},
			channel: "guild",
			args: [
				{
					id: "id",
					type: "string",
				},
				{
					id: "type",
					type: "lowercase",
				},
				{
					id: "reason",
					type: "string",
					match: "rest",
				},
			],
		});
	}

	async exec(message: Message, { id, type, reason }: { id: string; type: string; reason: string }) {
		const member = await this.client.utils.fetchMember(id, message.guild);
		if (!member)
			return message.util.send(`>>> ${this.client.mocks.emojis.redcross} | No user found.`);

		if (!["ticket", "report", "suggestion"].includes(type))
			return message.util.send(
				`>>> ${this.client.mocks.emojis.redcross} | Invalid type provided, type must be \`ticket\`, \`report\` or \`suggestion\`.`
			);

		if (!reason)
			return message.util.send(`>>> ${this.client.mocks.emojis.redcross} | No reason provided.`);

		// @ts-expect-error
		await this.client.supportHandler.blacklist(message, member.user, type, reason);
	}
}
