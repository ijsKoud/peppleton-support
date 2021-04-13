import { NewsChannel, TextChannel, Collection, Message } from "discord.js";
import { writeFile, readFile } from "fs/promises";
import prClient from "../client/client";
import { join } from "path";
import { JSDOM } from "jsdom";
import markdownParser from "./markdownParser";

// interfaces
const iDocument = new JSDOM().window.document;
interface iConfig {
	channel: TextChannel | NewsChannel;
	id: string;
}

export default class Transcript {
	public dom: JSDOM;
	public markdownParser: markdownParser;

	constructor(public client: prClient, public config: iConfig) {
		this.markdownParser = new markdownParser(this.client);
	}

	public async create(outdir: string): Promise<boolean> {
		try {
			let coll = new Collection<string, Message>();
			let res = await this.config.channel.messages.fetch({ limit: 100 });
			coll = coll.concat(res);

			while (res.size === 100) {
				res = await this.config.channel.messages.fetch({ limit: 100, before: res.lastKey() });
				if (res) coll = coll.concat(res);
			}

			const data = await readFile(join(__dirname, "..", "..", "template.html"));
			this.dom = new JSDOM(
				`<!DOCTYPE html>\n<html lang="en">\n<head>\n<title>${this.config.channel.guild.name} | ${
					this.config.channel.name
				}</title>\n<link rel="icon" type="image/png" href="${this.config.channel.guild.iconURL({
					size: 4096,
					format: "png",
				})}}"/>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width" />\n\n${new JSDOM(
					data
				).serialize()}\n</head>\n<body></body>\n</html>`
			);
			const { document } = this.dom.window;
			const body = document.getElementsByTagName("body").item(0);
			body.appendChild(this.getGuildDiv(document));

			let messages: Message[][] = [];
			let group: Message[] = [];

			res
				.array()
				.reverse()
				.forEach((msg) => {
					if (group.length && !this.joinable(msg, group[group.length - 1])) {
						messages.push(group);
						group = [msg];
					} else group.push(msg);
				});

			messages.push(group);

			await Promise.all(
				messages.map(async (g) => body.appendChild(await this.getMessageGroup(document, g)))
			);

			body.appendChild(this.getPostamble(document, res.size));
			await writeFile(outdir, this.dom.serialize());
		} catch (e) {
			this.client.log("ERROR", `Transcript error: \`\`\`${e.stack || e.message}\`\`\``);
			return false;
		}
		return true;
	}

	private joinable(msg1: Message, msg2: Message): boolean {
		return (
			msg1.author.id === msg2.author.id &&
			msg1.type === "DEFAULT" &&
			msg2.type === "DEFAULT" &&
			msg1.createdTimestamp - msg2.createdTimestamp <= 42e4
		);
	}

	private async getMessageGroup(document: typeof iDocument, messages: Message[]) {
		const message = messages[0];
		// main message group div
		const groupDiv = document.createElement("div");
		groupDiv.setAttribute("class", "chatlog__message-group");

		// avatar div
		const avatarDiv = this.getAvatar(
			document,
			message.system
				? "https://cdn.discordapp.com/avatars/669627189624307712/8530249cc2b90d3d9d92ae8bd55cbfce.png?size=4096"
				: message.author.displayAvatarURL({ dynamic: true, size: 128 })
		);
		groupDiv.appendChild(avatarDiv);

		// main message group div
		const messagesDiv = document.createElement("div");
		messagesDiv.setAttribute("class", "chatlog__messages");

		// username
		const userSpan = document.createElement("span");
		userSpan.setAttribute("class", "chatlog__author-name");
		userSpan.setAttribute("title", message.author.tag);
		userSpan.setAttribute("data-user-id", message.author.id);
		userSpan.setAttribute(
			"style",
			`color: ${message.system ? "#fff" : message.member?.displayHexColor || "#fff"}`
		);
		userSpan.appendChild(
			document.createTextNode(
				message.system
					? message.guild?.name || "DISCORD - SYSTEM"
					: message.member.nickname || message.author.username
			)
		);
		messagesDiv.append(userSpan, document.createTextNode("\n"));

		// add bot/system tag
		if (message.author.bot || message.system) {
			const tag = document.createElement("span");
			tag.setAttribute("class", "chatlog__bot-tag");
			tag.appendChild(
				document.createTextNode(message.author.bot ? "BOT" : message.system ? "SYTEM" : "UNKOWN")
			);
			messagesDiv.append(tag, document.createTextNode("\n"));
		}

		// timestamp div
		const timestamp = document.createElement("span");
		timestamp.setAttribute("class", "chatlog__timestamp");
		timestamp.appendChild(
			document.createTextNode(message.createdAt.toLocaleString("en-GB", { timeZone: "utc" }))
		);
		messagesDiv.appendChild(timestamp);
		await Promise.all(
			messages.map(async (m) => messagesDiv.appendChild(await this.getMessage(document, m)))
		);

		groupDiv.appendChild(messagesDiv);
		return groupDiv;
	}

	private async getMessage(document: typeof iDocument, message: Message) {
		const div = document.createElement("div");
		div.setAttribute("class", "chatlog__message");
		div.setAttribute("id", `message-${message.id}`);
		div.setAttribute("data-message-id", message.id);

		if (message.system) message = this.parseMessage(message);
		div.appendChild(await this.toHTML(document, message));
		if (message.editedTimestamp) {
			const edited = document.createElement("span");
			edited.setAttribute("class", "chatlog__edited-timestamp");
			edited.setAttribute("title", message.editedAt.toLocaleString("en-GB", { timeZone: "utc" }));
			edited.append("(edited)");
			div.appendChild(edited);
		}

		if (message.embeds.length) div.append(...this.getEmbeds(document, message));
		const attachments = this.getAttachments(document, message);
		attachments.forEach((a) => div.appendChild(a));

		return div;
	}

	private parseMessage(message: Message): Message {
		switch (message.type) {
			case "PINS_ADD":
				message.content = `Message from ${message.author.toString()} pinned.`;
				break;
			default:
				message.content = "System Message";
				break;
		}

		return message;
	}

	private getEmbeds(document: typeof iDocument, message: Message): any[] {
		const embeds: any[] = [];
		for (const embed of message.embeds) {
			switch (embed.type) {
				case "image":
					{
						const a = document.createElement("a");
						a.setAttribute("href", embed.url);

						const img = document.createElement("img");
						img.setAttribute("class", "chatlog__attachment-thumbnail");
						img.setAttribute("alt", "Image Attachment");
						img.setAttribute("src", embed.url);
						a.appendChild(img);

						embeds.push(a);
					}
					break;
				case "video":
					{
						const video = document.createElement("video");
						video.setAttribute("class", "chatlog__attachment-thumbnail");
						video.setAttribute("controls", "");

						const source = document.createElement("source");
						source.setAttribute("src", embed.url);
						source.setAttribute("alt", "Video Attachment");

						video.appendChild(source);
						embeds.push(video);
					}
					break;
				case "rich":
					{
						// to do: rich embeds
					}
					break;
				default:
					break;
			}
		}

		return embeds;
	}

	private async toHTML(document: typeof iDocument, message: Message) {
		const contentDiv = document.createElement("div");
		contentDiv.setAttribute("class", "chatlog__content");

		const mdDiv = document.createElement("div");
		mdDiv.setAttribute("class", "markdown");

		const mainSpan = document.createElement("span");
		mainSpan.setAttribute("class", "preserve-whitespace");

		const element = await this.markdownParser.parse(message);
		mainSpan.appendChild(element);
		mdDiv.appendChild(mainSpan);
		contentDiv.appendChild(mdDiv);
		return contentDiv;
	}

	private getAttachments(document: typeof iDocument, message: Message) {
		const urls = this.client.utils.getAttachments(message.attachments);
		if (!urls.length) return [];

		return urls.map((url) => {
			const attachmentDiv = document.createElement("div");
			attachmentDiv.setAttribute("class", "chatlog__attachment");

			const onClickDiv = document.createElement("div");
			onClickDiv.setAttribute("class", "");
			onClickDiv.setAttribute("onclick", "");

			const div = document.createElement("div");
			div.setAttribute("class", "");

			const imgRegex = /^.*(jpg|png|gif|webp|tiff|psd|raw|bmp|heif|indd)$/g;
			const videoRegex = /^.*(webm|mpg|mp2|mpeg|mpe|mpv|ogg|mp4|m4p|m4v|avi|wmv|mov|qt|flv|swf|avchd)$/g;
			const audioRegex = /^.*(pcm|wav|aiff|mp3|acc|ogg|wma|flac|alac)$/g;

			const attachment = message.attachments.find((a) => url === a.url);
			if (imgRegex.test(url)) {
				const a = document.createElement("a");
				a.setAttribute("href", url);

				const img = document.createElement("img");
				img.setAttribute("class", "chatlog__attachment-thumbnail");
				img.setAttribute("alt", "Image Attachment");
				img.setAttribute("src", url);
				img.setAttribute(
					"title",
					`${attachment.name} (${this.client.utils.formatBytes(attachment.size)})`
				);
				a.appendChild(img);

				div.appendChild(a);
			} else if (videoRegex.test(url)) {
				const video = document.createElement("video");
				video.setAttribute("class", "chatlog__attachment-thumbnail");
				video.setAttribute("controls", "");

				const source = document.createElement("source");
				source.setAttribute("src", url);
				source.setAttribute("alt", "Video Attachment");

				video.appendChild(source);
				div.appendChild(video);
			} else if (audioRegex.test(url)) {
				const audio = document.createElement("audio");
				audio.setAttribute("class", "chatlog__attachment-thumbnail");
				audio.setAttribute("controls", "");

				const source = document.createElement("source");
				source.setAttribute("src", url);
				source.setAttribute("alt", "Audio Attachment");

				audio.appendChild(source);
				div.appendChild(audio);
			} else {
				const container = document.createElement("div");
				container.setAttribute("class", "chatlog__attachment-container");

				const file = document.createElement("div");
				file.setAttribute("class", "chatlog__attachment-filename");

				const a = document.createElement("a");
				a.setAttribute("href", url);
				a.appendChild(document.createTextNode(attachment.name));
				file.appendChild(a);

				const size = document.createElement("div");
				size.setAttribute("class", "chatlog__attachment-filesize");
				size.appendChild(document.createTextNode(this.client.utils.formatBytes(attachment.size)));

				container.append(file, size);
				div.appendChild(container);
			}

			onClickDiv.appendChild(div);
			attachmentDiv.appendChild(onClickDiv);
			return attachmentDiv;
		});
	}

	private getAvatar(document: typeof iDocument, imgUrl: string) {
		// avatar div
		const div = document.createElement("div");
		div.setAttribute("class", "chatlog__author-avatar-container");

		// image
		const img = document.createElement("img");
		img.setAttribute("class", "chatlog__author-avatar");
		img.setAttribute("src", imgUrl);
		img.setAttribute("alt", "avatar");

		div.appendChild(img);
		return div;
	}

	private getGuildDiv(document: typeof iDocument) {
		// guild div
		const guildDiv = document.createElement("div");
		guildDiv.setAttribute("class", "preamble");

		// guild icon div
		let divContainer = document.createElement("div");
		const guildImg = document.createElement("img");
		divContainer.setAttribute("class", "preamble__guild-icon-container");
		guildImg.setAttribute("class", "preamble__guild-icon");
		guildImg.setAttribute("src", this.config.channel.guild.iconURL({ dynamic: true, size: 4096 }));
		guildImg.setAttribute("alt", this.config.channel.guild.name);
		divContainer.appendChild(guildImg);
		guildDiv.appendChild(divContainer);

		// guild channel div
		divContainer = document.createElement("div");
		divContainer.setAttribute("class", "preamble__entries-container");
		[`Guild: ${this.config.channel.guild.name}`, `Channel: ${this.config.channel.name}`].forEach(
			(str) => {
				const div = document.createElement("div");
				div.setAttribute("class", "preamble__entry");
				div.appendChild(document.createTextNode(str));
				divContainer.appendChild(div);
			}
		);

		const div = document.createElement("div");
		div.setAttribute("class", "preamble__entry--small");
		div.appendChild(document.createTextNode(this.config.channel.topic || ""));

		divContainer.appendChild(div);
		guildDiv.appendChild(divContainer);

		return guildDiv;
	}

	private getPostamble(document: typeof iDocument, amount: number) {
		// postamble div
		const mainDiv = document.createElement("div");
		mainDiv.setAttribute("class", "postamble");

		[
			`Exported ${amount} message${amount === 1 ? "" : "s"}`,
			`${new Date().toLocaleString("en-GB", { timeZone: "utc" })}`,
		].forEach((str) => {
			const div = document.createElement("div");
			div.setAttribute("class", "postamble__entry");
			div.appendChild(document.createTextNode(str));
			mainDiv.appendChild(div);
		});

		return mainDiv;
	}
}
