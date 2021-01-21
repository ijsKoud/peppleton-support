import { AkairoClient, CommandHandler, ListenerHandler } from "discord-akairo";
import { owners, prefix, wbId, wbToken, db } from "./config";
import { Message } from "discord.js";
import { join } from "path";
import { WebhookClient, Collection } from "discord.js";
import { connect, connection } from "mongoose";
declare module "discord-akairo" {
	interface AkairoClient {
		commandHandler: CommandHandler;
		listenerHandler: ListenerHandler;
		log(msg: string): void;
		tickets: boolean;
		openTickets: Collection<string, boolean>;
	}
}

interface botOptions {
	token?: string;
	owners?: string | string[];
}

export default class botClient extends AkairoClient {
	public openTickets = new Collection<string, boolean>();
	public tickets: boolean = true;
	public config: botOptions;
	private wb: WebhookClient = new WebhookClient(wbId, wbToken);

	public listenHandler: ListenerHandler = new ListenerHandler(this, {
		directory: join(__dirname, "..", "events"),
	});
	public commandHandler: CommandHandler = new CommandHandler(this, {
		directory: join(__dirname, "..", "commands"),
		prefix: prefix,
		allowMention: true,
		handleEdits: true,
		commandUtil: true,
		commandUtilLifetime: 3e5,
		defaultCooldown: 6e4,
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
		ignorePermissions: owners,
		ignoreCooldown: owners,
	});

	public constructor(config: botOptions) {
		super({
			ownerID: config.owners,
		});

		this.config = config;
	}

	private async _init(): Promise<void> {
		this.commandHandler.useListenerHandler(this.listenHandler);
		this.listenHandler.setEmitters({
			commandHandler: this.commandHandler,
			listenerHandler: this.listenHandler,
			process,
		});

		this.commandHandler.loadAll();
		this.listenHandler.loadAll();
	}

	private connect(): void {
		connect(db, {
			useCreateIndex: true,
			useNewUrlParser: true,
			useUnifiedTopology: true,
			useFindAndModify: false,
		});

		connection
			.on("connecting", () => this.log(`⏳ | Connecting to **${connection.name}** database...`))
			.once("connected", () =>
				this.log(`📁 | Successfully established a connection with **${connection.name}**!`)
			)
			.on("reconnected", () =>
				this.log(`📁 | Successfully re-established a connection with **${connection.name}**!`)
			)
			.on("disconnected", () =>
				this.log(`❌ | Disconnected from **${connection.name}**! Waiting to reconnect`)
			)
			.on("error", (error: Error) =>
				this.log(`⚠ | New error - **${connection.name}** - Error: \`${error.message}\``)
			);
	}

	public async start(): Promise<string> {
		await this._init();
		this.connect();
		return this.login(this.config.token);
	}

	public log(msg: string): void {
		this.wb.send(">>> " + msg);
		console.log(msg.replace(/\*/g, "").replace(/`/g, ""));
	}
}
