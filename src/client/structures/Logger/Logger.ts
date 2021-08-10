import { WebhookClient } from "discord.js";
import Formatter from "./Formatter";

export default class Logger {
	public readonly name: string;
	public readonly timestamp: boolean;
	public readonly webhook: WebhookClient | null;
	private _debug: boolean;

	public constructor(options: LoggerOptions) {
		this.name = options.name;
		this._debug = options.debug ?? false;
		this.timestamp = options.timestamp ?? true;
		this.webhook = options.webhook ? new WebhookClient({ url: options.webhook }) : null;
	}

	public info(...input: unknown[]): this {
		return this.write(input, { level: "INFO", timestamp: Date.now() });
	}

	public debug(...input: unknown[]): this {
		if (this._debug) return this.write(input, { level: "DEBUG", timestamp: Date.now() });

		return this;
	}

	public error(...input: unknown[]): this {
		return this.write(input, { level: "ERROR", timestamp: Date.now() });
	}

	public fatal(...input: unknown[]): this {
		return this.write(input, { level: "FATAL", timestamp: Date.now() });
	}

	public warn(...input: unknown[]): this {
		return this.write(input, { level: "WARN", timestamp: Date.now() });
	}

	public trace(...input: unknown[]): this {
		return this.write(input, { level: "TRACE", timestamp: Date.now() });
	}

	public silly(...input: unknown[]): this {
		return this.write(input, { level: "SILLY", timestamp: Date.now() });
	}

	private write(input: unknown[], data: LogData): this {
		const options = {
			timestamp: this.timestamp ? data.timestamp : null,
			level: data.level,
			name: this.name,
		};

		const formatted = Formatter.format(input, options);
		console.log(formatted);

		if (this.webhook) {
			const str = Formatter.webhook(input, options);
			this.webhook.send(str.substr(0, 2000)).catch(() => null);
		}

		return this;
	}
}

export interface LoggerOptions {
	name: string;
	timestamp?: boolean;
	webhook?: string;
	debug?: boolean;
}

export interface LogData {
	level: LoggerLevel;
	timestamp: Date | number | null;
}

export type LoggerLevel = "INFO" | "WARN" | "ERROR" | "TRACE" | "SILLY" | "DEBUG" | "FATAL";
