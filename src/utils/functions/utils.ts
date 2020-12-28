import {
	GuildMember,
	NewsChannel,
	TextChannel,
	GuildEmoji,
	PermissionString,
	Message,
	Collection,
} from "discord.js";
import { appendFile } from "fs/promises";
import DiscordClient from "../../client/client";

export default class Util {
	/**
	 * Format the track or playlist duration
	 * @param {Number} ms - The duration in milliseconds
	 * @return {String} time - The formatted timestamp
	 */
	public formatTime(ms: number): string {
		const hours = Math.floor((ms / (1e3 * 60 * 60)) % 60),
			minutes = Math.floor(ms / 6e4),
			seconds = ((ms % 6e4) / 1e3).toFixed(0);

		//@ts-ignore
		return `${
			hours ? `${hours.toString().padStart(2, "0")}:` : ""
		}${minutes.toString().padStart(2, "0")}:${seconds
			.toString()
			.padStart(2, "0")}`;
	}

	/**
	 *
	 * @param client the client that is passed in when the command got triggered
	 * @param emojiName the name of the emoji
	 */
	public EmojiFinder(client: DiscordClient, name: string): GuildEmoji {
		return (
			client.guilds.cache
				.get("746536046275198997")
				.emojis.cache.find(
					(e) => e.name.toLowerCase() === name.toLowerCase()
				) || undefined
		);
	}

	public missingPerms(
		member: GuildMember,
		channel: TextChannel | NewsChannel,
		perms: Array<PermissionString>
	): Array<string> | string {
		const missingPerms = member.permissions.missing(perms).length
			? member.permissions.missing(perms).map(
					(str) =>
						`\`${str
							.replace(/_/g, " ")
							.replace(/GUILD/g, "SERVER")
							.toLowerCase()
							.replace(/\b(\w)/g, (char) => char.toUpperCase())}\``
			  )
			: channel
					.permissionsFor(member)
					.missing(perms)
					.map(
						(str) =>
							`\`${str
								.replace(/_/g, " ")
								.replace(/GUILD/g, "SERVER")
								.toLowerCase()
								.replace(/\b(\w)/g, (char) => char.toUpperCase())}\``
					);

		return missingPerms.length > 1
			? `${missingPerms.slice(0, -1).join(", ")} and ${
					missingPerms.slice(-1)[0]
			  }`
			: missingPerms[0];
	}

	public formatPerms(perms: string[]): Array<string> | string {
		const formattedPerms = perms.map(
			(str) =>
				`\`${str
					.replace(/_/g, " ")
					.replace(/GUILD/g, "SERVER")
					.toLowerCase()
					.replace(/\b(\w)/g, (char) => char.toUpperCase())}\``
		);

		return formattedPerms.length > 1
			? `${formattedPerms.slice(0, -1).join(", ")} and ${
					formattedPerms.slice(-1)[0]
			  }`
			: formattedPerms[0];
	}

	public filterMember(message: Message, id: string): GuildMember {
		return message.mentions.members.size
			? message.mentions.members.last()
			: id.length
			? message.guild.members.cache.get(id) ||
			  message.guild.members.cache.find((m) => m.user.username == id) ||
			  message.guild.members.cache.find((m) => m.user.tag == id)
			: undefined;
	}

	public trimArray(arr: Array<string>, maxLen = 10) {
		if (arr.length > maxLen) {
			const len = arr.length - maxLen;
			arr = arr.slice(0, maxLen);
			arr.push(`${len} more...`);
		}
		return arr;
	}

	public formatBytes(bytes: number) {
		if (bytes === 0) return "0 Bytes";
		const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
	}

	async transcript(message: Message, id: string): Promise<void | any> {
		await appendFile(
			`./src/transcriptions/${id}-ticket.txt`,
			`\n${message.author.tag}: ${message.content}`,
			"utf-8"
		).catch((e) => {
			return e;
		});
	}
}
