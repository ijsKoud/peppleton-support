import { Precondition, PreconditionResult } from "@sapphire/framework";
import { Message } from "discord.js";

export class StaffOnlyPrecondition extends Precondition {
	public run(message: Message): PreconditionResult {
		const data = this.container.client.constants.departments;
		const roles = this.container.client.isDev()
			? ["739540543570444368"]
			: [data.supervisor, data.manager, data.BoD];

		if (this.container.client.isOwner(message.author.id)) return this.ok();

		return message.member && message.member.roles.cache.some((r) => roles.includes(r.id))
			? this.ok()
			: this.error({
					message: "Only Staff members are able to use this command",
			  });
	}
}
