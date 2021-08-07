import { SapphireClient } from "@sapphire/framework";
import {
	ActivitiesOptions,
	BitFieldResolvable,
	Collection,
	IntentsString,
	PartialTypes,
	PresenceStatusData,
} from "discord.js";
import { join } from "path";
import Logger from "./structures/Logger/Logger";
import Utils from "./Utils";
import * as constants from "./constants";
import BlacklistManager from "./structures/BlacklistManager";

export default class Client extends SapphireClient {
	public owners: string[];
	public constants = constants;

	public isOwner(id: string): boolean {
		return this.owners.includes(id);
	}

	public BlacklistManager: BlacklistManager = new BlacklistManager(this, []);
	public loggers: Collection<string, Logger> = new Collection();
	public utils: Utils = new Utils(this);

	constructor(options: ClientOptions) {
		super({
			intents: options.intents,
			allowedMentions: { users: [], repliedUser: false, roles: [] },
			baseUserDirectory: join(__dirname, "..", "bot"),
			defaultPrefix: process.env.PREFIX,
			partials: options.partials,
			loadDefaultErrorListeners: false,
			presence: {
				activities: options.activity,
				status: options.status,
			},
		});

		this.owners = options.owners;

		const logger = new Logger({ name: "BOT", webhook: process.env.LOGS });
		this.loggers.set("bot", logger);

		if (options.debug)
			this.on("debug", (msg) => {
				logger.debug(msg);
			});
	}
}

interface ClientOptions {
	intents: BitFieldResolvable<IntentsString, number>;
	owners: string[];
	partials?: PartialTypes[] | undefined;
	activity?: ActivitiesOptions[] | undefined;
	status?: PresenceStatusData | undefined;
	debug?: boolean;
}

declare module "@sapphire/framework" {
	// eslint-disable-next-line no-shadow
	class SapphireClient {
		owners: string[];
		constants: typeof constants;
		isOwner(id: string): boolean;

		blacklistManager: BlacklistManager;
		utils: Utils;
		loggers: Collection<string, Logger>;
	}

	interface Preconditions {
		UserPermissions: never;
		OwnerOnly: never;
		Blacklisted: never;
	}
}
