import { Structures } from "discord.js";
import botBlacklist from "../models/bot/botBlacklist";
import Blacklist from "../models/tickets/Blacklist";

Structures.extend(
	"User",
	(User) =>
		class prUser extends User {
			public async getBlacklisted(): Promise<{
				support: ("suggestion" | "ticket" | "report")[];
				bot: boolean;
			}> {
				const support = (await Blacklist.findOne({ userId: this.id }))?.toObject?.();
				const bot = await botBlacklist.findOne({ userId: this.id });
				return {
					support: support?.type ?? [],
					bot: bot ? true : false,
				};
			}
		}
);

declare module "discord.js" {
	interface User {
		getBlacklisted(): Promise<{
			support: ("suggestion" | "ticket" | "report")[];
			bot: boolean;
		}>;
	}
}
