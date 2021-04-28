import { Collection } from "discord.js";
import { iStats } from "./../../models/interfaces";
import prClient from "../../client/client";
import Stats from "../../models/activity/Stats";

export default class activityManager {
	public cache = new Collection<string, iStats>();
	constructor(public client: prClient) {}

	public async loadAll() {
		const raw = await Stats.find();
		const data: iStats[] = raw.filter((r) => r).map((x) => x.toObject());

		await Promise.all(data.map(async (x) => await this.load(x)));
		await this.checkAll();

		setInterval(() => this.checkAll(), 6e4);
	}

	public async load(data: iStats) {
		this.cache.set(data.userId, data);
		await this.check(data);
	}

	public async check(data: iStats) {
		const { role, max } = this.client.mocks.activity;
		const guild = this.client.guilds.cache.get(data.guildId);
		const member = await this.client.utils.fetchMember(data.userId, guild);

		if (!member) return;
		if (data.messages.length > max) member.roles.add(role).catch((e) => null);
		else member.roles.remove(role).catch((e) => null);
	}

	public async checkAll() {
		this.cache.map((d) =>
			d.messages.filter((x) => x < Date.now()).map((id) => this.remove(id, d.userId))
		);

		this.cache.forEach((x) => this.check(x));
		await this.updateAll();
	}

	public async update(userId: string, guildId: string) {
		const date = Date.now() + this.client.mocks.activity.time;
		// const date = Date.now() + 6e4 / 2;

		const data =
			(await Stats.findOne({ userId, guildId })) ||
			(await Stats.create({ userId, guildId, messages: [] }));

		data.messages.push(date);
		await data.save();

		this.cache.set(userId, data.toObject());
	}

	public async updateAll() {
		this.cache.forEach(
			async (x) => await Stats.findOneAndUpdate({ guildId: x.guildId, userId: x.userId }, x)
		);
	}

	public remove(id: number, userId: string) {
		const data = this.cache.get(userId);
		if (!data)
			return this.client.log(
				"WARN",
				`activityManager#remove(): Unkown remove request, user: \`${userId}\` - id: \`${id}\``
			);

		data.messages = data.messages.filter((x) => x !== id);
		this.cache.set(userId, data);

		// console.log(
		// 	`removing ${id} from ${userId} - their message count is now ${data.messages.length}`
		// );
	}
}
