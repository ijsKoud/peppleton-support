import { Activity } from "@prisma/client";
import { Collection } from "discord.js";
import Client from "../../Client";

export default class activityManager {
	public cache = new Collection<string, Activity>();
	public timeouts = new Collection<string, NodeJS.Timeout>();

	private queue = new Collection<string, Activity>();

	constructor(public client: Client) {}

	public async loadAll() {
		const raw = await this.client.prisma.activity.findMany();
		const data = raw.filter((r) => r);

		await Promise.all(data.map(async (x) => await this.load(x)));
		this.loadVoice(raw.length ? raw[0].id : process.env.GUILD ?? "");
		await this.checkAll();

		setInterval(() => this.checkAll(), 6e4);
	}

	public async load(data: Activity) {
		this.cache.set(data.id, data);
		await this.check(data);
	}

	public loadVoice(id: string) {
		const [, guildId] = id.split("-");
		const guild = this.client.guilds.cache.get(guildId);
		if (guild)
			guild.voiceStates.cache.forEach((state) => {
				if (state?.channelId && !state.member?.user.bot)
					this.start(state.member?.id ?? "", guildId);
			});
	}

	public async check(data: Activity) {
		const { role, max } = this.client.constants.activity;
		const guild = this.client.guilds.cache.get(data.id.split("-")[1]);
		if (!guild) return;

		const member = await this.client.utils.fetchMember(data.id, guild);

		if (!member) return;
		if (data.messages.length > max && !member.roles.cache.has(role))
			member.roles.add(role).catch(() => void 0);
		else if (data.messages.length < max && member.roles.cache.has(role))
			member.roles.remove(role).catch(() => void 0);
	}

	public async checkAll() {
		this.cache.forEach((d) =>
			d.messages.filter((x) => x < Date.now()).map((id) => this.remove(id, d.id))
		);

		this.cache.forEach((d) =>
			d.voice.filter((x) => x < Date.now()).map((id) => this.removeVoice(id, d.id))
		);

		this.cache.forEach((x) => this.check(x));
	}

	public async update(userId: string, guildId: string) {
		const date = Date.now() + this.client.constants.activity.time;
		// const date = Date.now() + 6e4 / 2;

		const data =
			this.cache.get(`${userId}-${guildId}`) ||
			(await this.client.prisma.activity.findFirst({ where: { id: `${userId}-${guildId}` } })) ||
			(await this.client.prisma.activity.create({ data: { id: `${userId}-${guildId}` } }));

		data.messages.push(BigInt(date));
		this.setQueue(`${userId}-${guildId}`, data);

		this.cache.set(userId, data);
	}

	public remove(id: bigint, dataId: string) {
		const data = this.cache.get(dataId);
		if (!data)
			return this.client.loggers
				.get("bot")
				?.warn(
					`activityManager#remove(): Unkown remove request, dataId: \`${dataId}\` - id: \`${id}\``
				);

		data.messages = data.messages.filter((x) => x !== id);
		this.cache.set(dataId, data);
		this.setQueue(dataId, data);

		// console.log(
		// 	`removing ${id} from ${userId} - their message count is now ${data.messages.length}`
		// );
	}

	public removeVoice(id: bigint, dataId: string) {
		const data = this.cache.get(dataId);
		if (!data)
			return this.client.loggers
				.get("bot")
				?.warn(
					`activityManager#remove(): Unkown remove request, dataId: \`${dataId}\` - id: \`${id}\``
				);

		data.voice = data.messages.filter((x) => x !== id);
		this.cache.set(dataId, data);
		this.setQueue(dataId, data);

		// console.log(
		// 	`removing ${id} from ${userId} - their message count is now ${data.messages.length}`
		// );
	}

	private setQueue(id: string, data: Activity) {
		if (!this.queue.size) {
			this.queue.set(id, data);
			this.process();
		}

		this.queue.set(id, data);
	}

	private process() {
		this.queue.forEach(async (v) => {
			await this.client.prisma.activity.update({ where: { id: v.id }, data: v });
			this.queue.delete(v.id);
		});
	}

	private async sync(userId: string, guildId: string) {
		const date = Date.now() + this.client.constants.activity.time;
		// const date = Date.now() + 6e4 / 2;

		const data =
			this.cache.get(`${userId}-${guildId}`) ||
			(await this.client.prisma.activity.findFirst({ where: { id: `${userId}-${guildId}` } })) ||
			(await this.client.prisma.activity.create({ data: { id: `${userId}-${guildId}` } }));

		data.voice.push(BigInt(date));

		this.setQueue(`${userId}-${guildId}`, data);
		this.cache.set(`${userId}-${guildId}`, data);
	}

	public start(userId: string, guildId: string) {
		if (this.timeouts.has(`${userId}-${guildId}`)) return;

		const interval = setInterval(() => this.sync(userId, guildId), 6e4);
		this.timeouts.set(`${userId}-${guildId}`, interval);
	}

	public end(userId: string, guildId: string) {
		const data = this.timeouts.get(`${userId}-${guildId}`);
		if (!data) return;

		clearInterval(data);
	}
}
