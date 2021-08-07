import {
	Collection,
	MessageAttachment,
	MessageEmbed,
	MessageEmbedOptions,
	PermissionResolvable,
	PermissionString,
} from "discord.js";
import Client from "./Client";

export default class Utils {
	constructor(public client: Client) {}

	public formatPerms(perms: PermissionString[] | PermissionResolvable): string {
		if (!Array.isArray(perms) || perms.length === 0) return "`―`";

		const formattedPerms = perms.map(
			(str) =>
				`\`${str
					.replace(/_/g, " ")
					.replace(/GUILD/g, "SERVER")
					.toLowerCase()
					.replace(/\b(\w)/g, (char) => char.toUpperCase())}\``
		);

		return formattedPerms.length > 1
			? `\`${formattedPerms.slice(0, -1).join("`, `")}\` and \`${formattedPerms.slice(-1)[0]}\``
			: `\`${formattedPerms[0]}\``;
	}

	public createEmbed(options: MessageEmbedOptions): MessageEmbed[] {
		return [new MessageEmbed({ color: process.env.COLOUR as `#${string}`, ...options })];
	}

	public trimArray(arr: Array<string>, maxLen = 10): string[] {
		if (arr.length > maxLen) {
			const len = arr.length - maxLen;
			arr = arr.slice(0, maxLen);
			arr.push(`${len} more...`);
		}
		return arr;
	}

	public formatBytes(bytes: number): string {
		if (bytes === 0) return "0 Bytes";
		const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
	}

	public getAttachments(attachments: Collection<string, MessageAttachment>): string[] {
		const valid = /^.*(gif|png|jpg|jpeg|mp4|mp3|pdf|psd)$/g;

		return attachments
			.filter((attachment) => valid.test(attachment.url))
			.map((attachment) => attachment.url);
	}
}
