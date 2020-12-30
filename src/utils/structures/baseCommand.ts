import { Message, PermissionString } from "discord.js";
import DiscordClient from "../../client/client";

interface Options {
	category: string;
	aliases: string[];
	ownerOnly: boolean;
	channelType: "dm" | "guild" | "both";
	timeout?: number;
	description?: string;
	usage?: string;
	clientPermissions?: PermissionString[];
	userPermissions?: PermissionString[];
	customPermissions?: "sv+" | "manager+" | "director+";
}

export default abstract class BaseCommand {
	constructor(private Name: string, private Options: Options) {}

	get name(): string {
		return this.Name;
	}
	get options(): Options {
		return this.Options;
	}

	abstract run(
		client: DiscordClient,
		message: Message,
		args: Array<string> | null
	): Promise<Message | any>;
}
