/* eslint-disable @typescript-eslint/no-explicit-any */
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
import activityManager from "./handlers/activity/activityManager";
import { Api, AuthCookie } from "./structures/Api";

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
	public ApiCache = new Collection<string, any>();

	public supportHandler: SupportHandler;
	public Api: Api;

	public activityManager: activityManager = new activityManager(this);
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

		const SupportLogger = new Logger({ name: "SUPPORT", webhook: process.env.LOGS });
		this.loggers.set("support", SupportLogger);

		const ApiLogger = new Logger({ name: "API", webhook: process.env.LOGS });
		this.loggers.set("api", ApiLogger);

		this.owners = options.owners;

		// handlers init
		this.supportHandler = new SupportHandler(this);
		this.Api = new Api(this);

		if (options.debug)
			this.on("debug", (msg) => {
				botLogger.debug(msg);
			});

		process.on("unhandledRejection", this.handleRejection.bind(this));
	}

	private handleRejection(reason: unknown) {
		this.loggers.get("bot")?.error("Unhandled rejection: ", reason);
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
		activityManager: activityManager;
		blacklistManager: BlacklistManager;
		utils: Utils;
		Api: Api;

		ApiCache: Collection<string, any>;
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

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		export interface Request {
			auth: AuthCookie | null;
		}
	}
}
