import { Precondition, PreconditionResult } from "@sapphire/framework";
import { Command } from "../../client/structures/Command";
import { Message } from "discord.js";

export class UserPermissionsPrecondition extends Precondition {
	public run(message: Message, command: Command): PreconditionResult {
		if (!message.member) return this.ok();

		const missing = message.member.permissions.missing(command.permissions, true);
		if (!missing.length || this.container.client.owners.includes(message.author.id))
			return this.ok();

		return this.error({
			message: `You are missing the following permissions: ${this.container.client.utils.formatPerms(
				missing
			)}`,
		});
	}
}
