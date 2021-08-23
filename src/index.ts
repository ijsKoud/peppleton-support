import { config } from "dotenv";
config();

import Client from "./client/Client";

const owners = process.env.OWNERS?.split(" ") ?? [];

new Client({
	intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"],
	partials: ["GUILD_MEMBER", "MESSAGE"],
	debug: !!process.env.DEBUG,
	activity: [
		{
			type: "LISTENING",
			name: "your support tickets",
		},
	],
	owners,
}).start();
