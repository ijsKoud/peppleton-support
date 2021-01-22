import { Listener } from "discord-akairo";
import {
	DMChannel,
	GuildChannel,
	User,
	TextChannel,
	MessageEmbed,
	MessageAttachment,
} from "discord.js";
import { unlink } from "fs/promises";
import { transcriptionsChannel } from "../../client/config";
import ticket from "../../models/ticket";

export default class channelDelete extends Listener {
	constructor() {
		super("channelDelete", {
			emitter: "client",
			event: "channelDelete",
			category: "client",
		});
	}

	async exec(channel: DMChannel | GuildChannel): Promise<void> {
		if (channel.type !== "text" || !channel.name.endsWith("-ticket")) return;

		const ticketChannel = channel as TextChannel;
		if (!ticketChannel.name.endsWith("-ticket")) return;

		const schema = await ticket.findOne({ channelId: channel.id });
		const reason =
			((Date.now() - schema.get("lastMessage")) as number) > 864e5
				? "inactive"
				: "closed by claimer";

		const userId = ticketChannel.name.slice(0, -7);
		let user: User;
		try {
			user = await this.client.users.fetch(userId);
		} catch (e) {}

		schema.delete();
		try {
			reason === "inactive"
				? user.send(
						"> 🕐 | Your ticket has been closed automatically for being inactive for 24 hours. \n > ❓ | Need more support? Open another ticket!"
				  )
				: user.send(
						`> 👍 | Your ticket is now closed, thanks for getting in touch! \n > ❓ | Questions? Don't hesitate to contact us again, we are always happy to help!`
				  );
		} catch (e) {}

		const tsChannel = (await this.client.channels.fetch(transcriptionsChannel)) as TextChannel;
		const embed = new MessageEmbed()
			.setTitle(`New ticket transcription`)
			.setColor("#D0771F")
			.setDescription([
				`> 📞 | **Claimer**: <@${ticketChannel.topic.split(/\|/g)[0]}>`,
				`> 👤 | **Owner**: <@${userId}>`,
			]);

		const attachment = new MessageAttachment(
			`./src/transcriptions/${userId}-ticket.txt`,
			`${userId}-ticket.txt`
		);

		await tsChannel.send(embed);
		tsChannel.send(attachment);

		setTimeout(() => unlink(`./src/transcriptions/${userId}-ticket.txt`), 5000);
	}
}
