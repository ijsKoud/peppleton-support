import { Listener } from "discord-akairo";
import { GuildChannel } from "discord.js";
import { DMChannel } from "discord.js";
import Ticket from "../../models/tickets/Ticket";

export default class channelDelete extends Listener {
	constructor() {
		super("channelDelete", {
			emitter: "client",
			event: "channelDelete",
		});
	}

	async exec(channel: DMChannel | GuildChannel) {
		if (channel.type !== "text" || !channel.name.startsWith("ticket-")) return;
		const ticket = await Ticket.findOne({ channelId: channel.id });
		if (!ticket) return;

		const user = await this.client.utils.fetchUser(ticket.userId);
		try {
			if (Date.now() - ticket.lastMsg > 864e5)
				user.send(
					`>>> 🕐 | Your ticket (\`${ticket.caseId}\`) has been closed automatically for being inactive for 24 hours.\n❓ | Need more support? Open another ticket!`
				);
			else
				user.send(
					`>>> 📪 | Your ticket (\`${ticket.caseId}\`) has been closed by the ticket claimer, thanks for getting in touch!\nDon't hesitate to contact us again, we are always happy to help you!`
				);

			await ticket.deleteOne();
		} catch (e) {}
	}
}
