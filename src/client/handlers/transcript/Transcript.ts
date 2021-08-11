import { TextChannel } from "discord.js";
import Client from "../../Client";

export class Transcript {
	public client: Client;
	public channel: TextChannel;

	constructor(options: { client: Client; channel: TextChannel }) {
		this.client = options.client;
		this.channel = options.channel;
	}

	public async create(location: string) {
		return null;
	}
}
