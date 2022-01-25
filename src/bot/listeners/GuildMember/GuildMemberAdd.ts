import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import type { GuildMember, TextChannel } from "discord.js";

@ApplyOptions<Listener.Options>({ event: "guildMemberAdd" })
export default class extends Listener {
	public async run(member: GuildMember) {
		const channel = (await this.container.client.utils.getChannel(
			"705523496159281166"
		)) as TextChannel | null;
		if (!channel) return;

		await channel.send(`Please welcome ${member} to the server 👋`).catch(() => void 0);
	}
}
