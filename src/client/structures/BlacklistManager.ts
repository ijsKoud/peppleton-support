import Client from "../Client";

export default class BlacklistManager {
	public blocked: string[];

	constructor(public client: Client, blocked: string[]) {
		this.blocked = blocked;
	}

	public isBlacklisted(userId: string, guildId = ""): boolean {
		return this.blocked.includes(userId) || this.blocked.includes(guildId);
	}
}
