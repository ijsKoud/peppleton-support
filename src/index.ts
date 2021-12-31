import { config } from "dotenv";
config();

import { Client } from "./client";

const client = new Client({
	intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES", "DIRECT_MESSAGES", "GUILD_MEMBERS", "GUILD_MESSAGE_REACTIONS"],
	partials: ["MESSAGE", "CHANNEL", "GUILD_MEMBER", "REACTION"],
	owners: (process.env.OWNERS ?? "").split(","),
	activity: [
		{
			type: "LISTENING",
			name: "your support tickets"
		}
	]
});

void client.start();
