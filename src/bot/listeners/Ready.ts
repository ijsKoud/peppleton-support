import { Listener, ListenerOptions } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";

@ApplyOptions<ListenerOptions>({ once: true, event: "ready" })
export default class ReadyListener extends Listener {
	public run(): void {
		this.container.client.loggers
			.get("bot")
			?.info(`${this.container.client.user?.tag} has logged in!`);

		this.container.client.activityManager.loadAll();
		this.container.client.Api.start();
		this.checkTickets();
	}

	async checkTickets() {
		// const { client } = this.container;
		// const tickets = await client.prisma.ticket.findMany();
		// tickets
		// 	.filter(({ status, lastMsg }) => status === "open" && Date.now() - (lastMsg ?? 0) >= 864e5)
		// 	.forEach((ticket) =>
		// 		client.supportHandler.ticketHandler.close(ticket, {
		// 			inactive: true,
		// 		})
		// 	);
		// setInterval(() => this.checkTickets(), 6e4);
	}
}
