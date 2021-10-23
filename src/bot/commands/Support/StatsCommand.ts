import { Command } from "../../../client/structures/Command";
import { ApplyOptions } from "@sapphire/decorators";
import { Message } from "discord.js";
import { Args } from "@sapphire/framework";
import ms from "ms";

@ApplyOptions<Command.Options>({
	name: "stats",
	aliases: ["stats"],
	description: "Shows the activity of someone (time spent in vc and amount of messages)",
	preconditions: ["ManagerOnly", "GuildOnly"],
	usage: "[user]",
})
export default class StatsCommand extends Command {
	public async messageRun(message: Message, args: Args) {
		if (!message.member) return;
		const { client } = this.container;
		let { value: member } = await args.pickResult("member");
		if (!member) member = message.member;

		const id = `${member.id}-${message.guildId}`;
		const data =
			client.activityManager.cache.get(id) ||
			(await client.prisma.activity.findFirst({ where: { id } }));
		if (!data)
			return message.reply(
				`>>> ${client.constants.emojis.greentick} | Unable to get the activity data of **${member.user.tag}**.`
			);

		const embed = client.utils
			.embed()
			.setTitle(`Activity - ${member.user.tag}`)
			.setDescription(
				[
					`VC Time: ${ms(data.voice.length * client.constants.activity.duration, { long: true })}`,
					`Messages: ${data.messages.length} message(s)`,
				].join("\n")
			);

		await message.reply({
			embeds: [embed],
		});
	}
}
