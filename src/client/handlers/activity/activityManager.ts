import { Activity } from "@prisma/client";
import { Collection } from "discord.js";
import Client from "../../Client";

export default class activityManager {
	public cache = new Collection<string, Activity>();
	constructor(public client: Client) {}

	public async loadAll() {
		const raw = await this.client.prisma.activity.findMany();
		const data = raw.filter((r) => r);

		await Promise.all(data.map(async (x) => await this.load(x)));
		await this.checkAll();

		setInterval(() => this.checkAll(), 6e4);
	}

	public async load(data: Activity) {
		this.cache.set(data.id, data);
		await this.check(data);
	}

	public async check(data: Activity) {
		const { role, max } = this.client.constants.activity;
		const guild = this.client.guilds.cache.get(data.guildId);
		if (!guild) return;

		const member = await this.client.utils.fetchMember(data.id, guild);

		if (!member) return;
		if (data.messages.length > max && !member.roles.cache.has(role))
			member.roles.add(role).catch(() => void 0);
		else if (data.messages.length < max && member.roles.cache.has(role))
			member.roles.remove(role).catch(() => void 0);
	}

	public async checkAll() {
		this.cache.map((d) =>
			d.messages.filter((x) => x < Date.now()).map((id) => this.remove(id, d.id))
		);

		this.cache.forEach((x) => this.check(x));
		await this.updateAll();
	}

	public async update(userId: string, guildId: string) {
		const date = Date.now() + this.client.constants.activity.time;
		// const date = Date.now() + 6e4 / 2;

		const data =
			this.cache.get(userId) ||
			(await this.client.prisma.activity.findFirst({ where: { id: userId } })) ||
			(await this.client.prisma.activity.create({ data: { id: userId, guildId } }));

		data.messages.push(date);
		await this.client.prisma.activity.update({ data, where: { id: userId } });

		this.cache.set(userId, data);
	}

	public async updateAll() {
		this.cache.forEach(
			async (x) => await this.client.prisma.activity.update({ where: { id: x.id }, data: x })
		);
	}

	public remove(id: number, userId: string) {
		const data = this.cache.get(userId);
		if (!data)
			return this.client.loggers
				.get("bot")
				?.warn(
					`activityManager#remove(): Unkown remove request, user: \`${userId}\` - id: \`${id}\``
				);

		data.messages = data.messages.filter((x) => x !== id);
		this.cache.set(userId, data);

		// console.log(
		// 	`removing ${id} from ${userId} - their message count is now ${data.messages.length}`
		// );
	}
}
