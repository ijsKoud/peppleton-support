import { PartialTypes } from "discord.js";
import { config } from "dotenv";
config();

import Client from "./client/Client";

const owners = process.env.OWNERS?.split(" ") ?? [];
const partials = (process.env.PARTIALS?.split(" ") ?? []) as PartialTypes[];

new Client({
	intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"],
	debug: !!process.env.DEBUG,
	activity: [
		{
			type: process.env.TYPE as
				| "PLAYING"
				| "STREAMING"
				| "LISTENING"
				| "WATCHING"
				| "CUSTOM"
				| "COMPETING",
			name: process.env.MESSAGE,
			url: process.env.URL,
		},
	],
	owners,
	partials,
}).start();
