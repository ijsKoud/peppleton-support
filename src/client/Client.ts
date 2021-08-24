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
import Logger from "./structures/Logger";
import Utils from "./Utils";
import * as constants from "./constants";
import BlacklistManager from "./structures/BlacklistManager";
import { PrismaClient } from "@prisma/client";
import SupportHandler from "./handlers/support/SupportHandler";

export default class Client extends SapphireClient {
	public owners: string[];
	public constants = constants;

	public isOwner(id: string): boolean {
		return this.owners.includes(id);
	}

	public isDev(): boolean {
		return this.user?.id === "711468893457088553";
	}

	public prisma = new PrismaClient();
	public utils: Utils = new Utils(this);
	public loggers: Collection<string, Logger> = new Collection();

	public supportHandler: SupportHandler;
	public blacklistManager: BlacklistManager = new BlacklistManager(this);

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

		// loggers setup
		const botLogger = new Logger({ name: "BOT", webhook: process.env.LOGS });
		this.loggers.set("bot", botLogger);

		const DataLogger = new Logger({ name: "DB", webhook: process.env.LOGS });
		this.loggers.set("db", DataLogger);

		const SupportLogger = new Logger({ name: "Support", webhook: process.env.LOGS });
		this.loggers.set("support", SupportLogger);

		this.owners = options.owners;

		// handlers init
		this.supportHandler = new SupportHandler(this);

		if (options.debug)
			this.on("debug", (msg) => {
				botLogger.debug(msg);
			});
	}

	public async start(): Promise<void> {
		await this.prisma.$connect();
		this.loggers.get("db")?.info("Successfully connected to postgreSQL Database via Prisma!");

		const blacklisted = await this.prisma.botBlacklist.findMany();
		this.blacklistManager.setBlacklisted(blacklisted.map((b) => b.id));

		await this.login(process.env.TOKEN);
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
		isDev(): boolean;

		prisma: PrismaClient;
		supportHandler: SupportHandler;
		blacklistManager: BlacklistManager;
		utils: Utils;
		loggers: Collection<string, Logger>;
	}

	interface Preconditions {
		UserPermissions: never;
		OwnerOnly: never;
		Blacklisted: never;
		StaffOnly: never;
		ManagerOnly: never;
	}
}
