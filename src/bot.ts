import { config } from "dotenv";
config();

import DiscordClient from "./client/client";
import { eventNotification } from "./config/config";

const client = new DiscordClient(
	{
		dbUrl: process.env.DB_URL,
		baseDir: __dirname,
		commandsDir: "./commands",
		eventsDir: "./events/clientEvents",
		owners: ["304986851310043136"],
	},
	{
		messageCacheLifetime: 864e5 * 7,
		allowedMentions: {
			roles: [eventNotification],
		},
		partials: ["MESSAGE", "REACTION", "USER", "CHANNEL", "GUILD_MEMBER"],
	}
);

(async () => {
	client.connect();
	client.start(process.env.DISCORD_BOT_TOKEN);
})();
