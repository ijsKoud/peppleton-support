import {
	DMChannel,
	GuildChannel,
	TextChannel,
	User,
	MessageAttachment,
} from "discord.js";
import BaseEvent from "../../utils/structures/BaseEvent";
import DiscordClient from "../../client/client";
import { ticketTimeout } from "../../utils/database/schemas";
import { unlink } from "fs/promises";
import { transcriptionsChannel } from "../../config/config";
import { MessageEmbed } from "discord.js";

export default class ChannelDeleteEvent extends BaseEvent {
	constructor() {
		super("channelDelete");
	}

	async run(client: DiscordClient, channel: DMChannel | GuildChannel) {
		const ticketChannel = channel as TextChannel;
		if (!ticketChannel.name.endsWith("-ticket")) return;

		const reason = client.activeTickets.get(ticketChannel.id).reason;

		const userId = ticketChannel.name.slice(0, -7);
		let user: User;
		try {
			user = await client.users.fetch(userId);
		} catch (e) {}

		try {
			reason === "inactive"
				? user.send(
						"> 🕐 | Your ticket has been closed automatically for being inactive for 24 hours. \n > ❓ | Need more support? Open another ticket!"
				  )
				: user.send(
						`> 👍 | Your ticket is now closed, thanks for getting in touch! \n > ❓ | Questions? Don't hesitate to contact us again, we are always happy to help!`
				  );
		} catch (e) {}

		try {
			(await ticketTimeout.findOne({ channelId: ticketChannel.id })).delete();
		} catch (e) {}

		client.activeTickets.delete(ticketChannel.id);
		client.openTickets.delete(userId);

		const tsChannel = (await client.channels.fetch(
			transcriptionsChannel
		)) as TextChannel;
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
