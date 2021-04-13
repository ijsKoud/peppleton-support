import prClient from "../client/client";
import { JSDOM } from "jsdom";
import { Message, TextChannel } from "discord.js";
import { toHTML } from "./discord-markdown";

export default class markdownParser {
	constructor(public client: prClient) {}

	public async parse(message: Message) {
		const html = toHTML(message.content, {
			discordCallback: {
				user: ({ id }: { id: string }) =>
					`@${this.client.users.cache.get(id.toString())?.username || "unkown"}`,
				channel: ({ id }: { id: string }) =>
					`#${
						message.mentions.channels.get(id.toString())?.name ||
						(this.client.channels.cache.get(id) as TextChannel)?.name ||
						"unkown"
					}`,
				role: ({ id }: { id: string }) =>
					`@${message.guild.roles.cache.get(id.toString())?.name || "unkown"}`,
			},
		}) as string;
		const parsed = new JSDOM(
			`<div id="content">${this._parse(html)}</div>`
		).window.document.getElementById("content");

		return parsed;
	}

	private _parse(data: string): string {
		data = data.replace(/\/blockquote/g, "div").replace(/blockquote/g, 'div class="quote"');
		return data;
	}
}
