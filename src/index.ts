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
			type: "LISTENING",
			name: "your support tickets",
		},
	],
	owners,
	partials,
}).start();
