import { config } from "dotenv";
config();

import Client from "./client/Client";

const owners = process.env.OWNERS?.split(" ") ?? [];
new Client({
	intents: ["GUILDS", "GUILD_MESSAGES"],
	debug: !!process.env.DEBUG,
	owners,
}).login(process.env.TOKEN);
