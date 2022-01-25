import { config } from "dotenv";
config();

import Client from "./client/Client";
new Client({
	intents: [
		"GUILDS",
		"GUILD_MESSAGES",
		"DIRECT_MESSAGES",
		"GUILD_MESSAGE_REACTIONS",
		"GUILD_VOICE_STATES",
		"GUILD_MEMBERS",
	],
	partials: ["GUILD_MEMBER", "MESSAGE", "REACTION", "CHANNEL"],
	owners: process.env.OWNERS?.split(" ") ?? [],
	debug: !!process.env.DEBUG,
	activity: [
		{
			type: "LISTENING",
			name: "your support tickets",
		},
	],
}).start();
