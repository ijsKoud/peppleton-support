import Client from "../Client";

export default class BlacklistManager {
	public blacklisted: string[] = [];

	constructor(public client: Client) {}

	public isBlacklisted(userId: string, guildId = ""): boolean {
		return this.blacklisted.includes(userId) || this.blacklisted.includes(guildId);
	}

	public setBlacklisted(blacklisted: string[]): this {
		this.blacklisted = blacklisted;

		return this;
	}

	public async blacklist(id: string): Promise<void> {
		if (this.blacklisted.includes(id)) return;
		this.blacklisted.push(id);
		await this.client.prisma.botBlacklist.create({ data: { id } });
	}

	public async getSupportBlacklisted(userId: string): Promise<string[] | null> {
		const data = await this.client.prisma.supportBlacklist.findFirst({ where: { id: userId } });
		return data?.types ?? null;
	}

	public async getFullBacklisted(userId: string): Promise<{ bot: boolean; support: string[] }> {
		const data = await this.client.prisma.supportBlacklist.findFirst({ where: { id: userId } });
		return {
			bot: this.isBlacklisted(userId),
			support: data?.types ?? [],
		};
	}
}
