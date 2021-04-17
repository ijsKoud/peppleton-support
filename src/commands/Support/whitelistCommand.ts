import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class whitelistCommand extends Command {
	constructor() {
		super("whitelist", {
			aliases: ["whitelist"],
			userPermissions: ["KICK_MEMBERS"],
			description: {
				content: "whitelist a user",
				usage: "whitelist <user> <type>",
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

		// @ts-expect-error
		await this.client.supportHandler.whitelist(message, member.user, type);
	}
}
