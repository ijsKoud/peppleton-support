import { Command } from "discord-akairo";
import { Message, TextChannel } from "discord.js";
import Transcript from "../../classes/Transcript";
import prClient from "../../client/client";

export default class test extends Command {
	constructor() {
		super("test", {
			aliases: ["test"],
			ownerOnly: true,
		});
	}

	async exec(message: Message) {
		await new Transcript(this.client as prClient, {
			channel: message.channel as TextChannel,
			id: "id_here",
		}).create("");
	}
}
