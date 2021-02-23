import { ListenerHandler } from "discord-akairo";
import { AkairoClient, CommandHandler } from "discord-akairo";
import { WebhookClient } from "discord.js";
import { Message } from "discord.js";
import { connect, connection } from "mongoose";
import { join } from "path";
import util from "./util";

import Logger from "logdown";
const logger = Logger("", { markdown: true });

// declare
declare module "discord-akairo" {
	interface AkairoClient {
		commandHandler: CommandHandler;
		listenerHandler: ListenerHandler;
		log(msg: string): void;
		utils: util;
	}
}

// client
export default class Client extends AkairoClient {
	private wb: WebhookClient = new WebhookClient(process.env.WB_ID, process.env.WB_TOKEN);
	public utils: util = new util(this);

	public listenerHandler: ListenerHandler = new ListenerHandler(this, {
		directory: join(__dirname, "..", "events"),
	});
	public commandHandler: CommandHandler = new CommandHandler(this, {
		directory: join(__dirname, "..", "commands"),
		prefix: process.env.PREFIX,
		allowMention: true,
		blockBots: true,
		blockClient: true,
		commandUtil: true,
		handleEdits: true,
		commandUtilLifetime: 3e5,
		defaultCooldown: 1e3,
		argumentDefaults: {
			prompt: {
				modifyStart: (_: Message, str: string): string =>
					`${str} \n\nType \`cancel\` to cancel the command!`,
				modifyRetry: (_: Message, str: string): string =>
					`${str} \n\nType \`cancel\` to cancel the command!`,
				timeout: "This took longer then expected, the command is canceled now!",
				ended: "Please take a break, try again later.",
				cancel: "Command is canceled!",
				retries: 3,
				time: 3e4,
			},
			otherwise: "",
		},
		ignorePermissions: this.ownerID,
		ignoreCooldown: this.ownerID,
	});
	public constructor({ ownerID }: { ownerID: string[] }) {
		super(
			{
				ownerID,
			},
			{
				disableMentions: "everyone",
			}
		);
	}

	private async _init(): Promise<void> {
		this.commandHandler.useListenerHandler(this.listenerHandler);
		this.listenerHandler.setEmitters({
			commandHandler: this.commandHandler,
			listenerHandler: this.listenerHandler,
			process,
		});

		this.commandHandler.loadAll();
		this.listenerHandler.loadAll();
	}

	private connect(): void {
		connect(process.env.DB, {
			useCreateIndex: true,
			useNewUrlParser: true,
			useUnifiedTopology: true,
			useFindAndModify: false,
		});

		connection
			.on("connecting", () => this.log(`⏳ | Connecting to **${connection.name}** database...`))
			.once("connected", () =>
				this.log(`📁 | Successfully connected to database: **${connection.name}**!`)
			)
			.on("reconnected", () =>
				this.log(`📁 | Successfully re-connected to database: **${connection.name}**!`)
			)
			.on("disconnected", () =>
				this.log(`❌ | Disconnected from **${connection.name}**! Reconnecting...`)
			)
			.on("error", (error: Error) =>
				this.log(`⚠ | New error - **${connection.name}** - Error: \`${error.message}\``)
			);
	}

	public async start(): Promise<string> {
		await this._init();
		this.connect();
		return this.login(process.env.TOKEN);
	}

	public log(msg: string): void {
		this.wb.send(">>> " + msg.substr(0, 2048 - 4));
		logger.log(msg.replace(/`/g, ""));
	}
}
