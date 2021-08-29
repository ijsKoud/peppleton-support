/* eslint-disable no-inline-comments */
import { Logger } from "@daangamesdg/logger";
import { NextFunction, Request, Response, Router } from "express";
import { lstat, readdir, readFile, rename, unlink } from "fs/promises";
import ms from "ms";
import { join } from "path";
import Client from "../../../Client";
import Utils from "../utils";

export class ApiRoute {
	public router: Router;
	public utils: Utils;

	constructor(public client: Client, public logger: Logger) {
		this.utils = new Utils(client);
		this.router = Router();
		this.router
			.get("/user", this.user.bind(this)) // get user
			.get("/activity", this.check.bind(this), this.activity.bind(this)); // get activity

		this.router
			.get("/transcripts", this.check.bind(this), this.transcripts.bind(this)) // get transcripts
			.get("/transcript", this.check.bind(this), this.transcriptGet.bind(this)) // get transcript
			.patch("/transcript", this.check.bind(this), this.transcriptPatch.bind(this)) // update transcript
			.delete("/transcript", this.check.bind(this), this.transcriptDelete.bind(this)); // delete transcript

		this.router
			.get("/shares", this.check.bind(this), this.shares.bind(this)) // get shares
			.get("/share/items", this.check.bind(this), this.sharesGet.bind(this)) // get amount of shares in folder
			.get("/share", this.check.bind(this), this.shareGet.bind(this)); // get shared item
	}

	private async check(req: Request, res: Response, next: NextFunction) {
		if (!req.auth) return res.send(null);

		try {
			const guild = this.client.guilds.cache.get(process.env.GUILD ?? "");
			if (!guild) throw new Error("Unable to get the correct guild");

			const member = await this.client.utils.fetchMember(req.auth.userId, guild);
			if (!member || !member.permissions.has("MANAGE_MESSAGES", true)) return res.send(null);

			next();
		} catch (e) {
			res.status(500).json({ message: "internal server error", error: (e as any).message });
		}
	}

	private async user(req: Request, res: Response) {
		if (!req.auth) return res.send(null);

		try {
			const user =
				this.client.ApiCache.get(`${req.auth.userId}-user`) ??
				(await this.utils.getUser(req.auth.token, req.auth.userId));
			if (!user) throw new Error("unable to get user");

			const guild = this.client.guilds.cache.get(process.env.GUILD ?? "");
			if (!guild)
				return res.send({ ...user, admin: this.client.isOwner(user.id), permissions: false });

			const member = await this.client.utils.fetchMember(req.auth.userId, guild);
			if (!member)
				return res.send({ ...user, admin: this.client.isOwner(user.id), permissions: false });

			res.send({
				...user,
				admin: this.client.isOwner(user.id),
				permissions: member.permissions.has("MANAGE_MESSAGES", true),
			});
		} catch (e) {
			res.status(500).json({ message: "internal server error", error: (e as any).message });
		}
	}

	private async activity(req: Request, res: Response) {
		if (!req.auth) return res.send(null);

		try {
			const data = await this.client.prisma.activity.findMany();
			const stats = await Promise.all(
				data
					.filter(
						(d) =>
							(d.voice.length > 0 || d.messages.length > 0) &&
							d.id.includes(process.env.GUILD as string)
					)
					.map(async (act) => {
						const user = await this.client.utils.fetchUser(act.id.split("-")[0]);

						return {
							user: user?.tag,
							avatar: user?.displayAvatarURL({ dynamic: true, size: 512 }),
							messages: act.messages.length,
							voice: ms(act.voice.length * this.client.constants.activity.duration, { long: true }),
						};
					})
			);

			res.send(stats);
		} catch (e) {
			res.status(500).json({ message: "internal server error", error: (e as any).message });
		}
	}

	private async transcripts(req: Request, res: Response) {
		if (!req.auth) return res.send(null);

		try {
			const base = join(process.cwd(), "transcripts");
			const files = await readdir(base);

			const valid = await Promise.all(
				files.map(async (f) => {
					const file = await lstat(join(base, f));
					return {
						date: Math.round(file.birthtimeMs),
						name: f.replace(".html", ""),
					};
				})
			);

			res.send(valid);
		} catch (e) {
			res.status(500).json({ message: "internal server error", error: (e as any).message });
		}
	}

	private async transcriptGet(req: Request, res: Response) {
		if (!req.auth) return res.send(null);
		const id = this.utils.parseQuery(req.query.id);
		if (!id) return res.sendStatus(400);

		try {
			const base = join(process.cwd(), "transcripts", `${id}.html`);
			const file = await readFile(base, "utf-8");
			const head =
				'document.addEventListener("DOMContentLoaded", () => document.querySelectorAll(".pre--multiline").forEach((block) => hljs.highlightBlock(block)) ); function messageJump(event, id) { event.preventDefault(); let element = document.getElementById(`message-${id}`); if (element) { element.classList.add("chat__message--highlighted"); window.scrollTo({ top: element.getBoundingClientRect().top - document.body.getBoundingClientRect().top - window.innerHeight / 2, behavior: "smooth", }); window.setTimeout(() => element.classList.remove("chat__message--highlighted"), 2e3); } } function showSpoiler(event, element) { event.preventDefault(); if (element && element.classList.contains("spoiler--hidden")) element.classList.remove("spoiler--hidden"); }';

			res.send({ data: file, head });
		} catch (e) {
			res.status(500).json({ message: "internal server error", error: (e as any).message });
		}
	}

	private async transcriptPatch(req: Request, res: Response) {
		if (!req.auth) return res.send(null);
		const body = req.body;
		if (!body || !body.id || !body.name) return res.sendStatus(400);
		if (!this.client.isOwner(req.auth.userId)) return res.sendStatus(401);

		try {
			const base = join(process.cwd(), "transcripts");
			await rename(join(base, body.id), join(body, body.name));

			res.sendStatus(204);
		} catch (e) {
			res.status(500).json({ message: "internal server error", error: (e as any).message });
		}
	}

	private async transcriptDelete(req: Request, res: Response) {
		if (!req.auth) return res.send(null);
		const id = this.utils.parseQuery(req.query.id);
		if (!id) return res.sendStatus(400);

		if (!this.client.isOwner(req.auth.userId)) return res.sendStatus(401);

		try {
			const base = join(process.cwd(), "transcripts");
			await unlink(join(base, id));

			res.sendStatus(204);
		} catch (e) {
			res.status(500).json({ message: "internal server error", error: (e as any).message });
		}
	}

	private async shares(req: Request, res: Response) {
		if (!req.auth) return res.send(null);

		try {
			const base = join(process.cwd(), "share");
			const dirs = await readdir(base);

			const valid = await Promise.all(
				dirs.map(async (dir) => {
					const file = await lstat(join(base, dir));
					return {
						date: Math.round(file.birthtimeMs),
						name: dir,
					};
				})
			);

			res.send(valid);
		} catch (e) {
			res.status(500).json({ message: "internal server error", error: (e as any).message });
		}
	}

	private async sharesGet(req: Request, res: Response) {
		if (!req.auth) return res.send(null);
		const dir = this.utils.parseQuery(req.query.dir);
		if (!dir) return res.sendStatus(400);

		try {
			const base = join(process.cwd(), "share", dir);
			const dirs = await readdir(base);

			res.send({ length: dirs.length });
		} catch (e) {
			res.status(500).json({ message: "internal server error", error: (e as any).message });
		}
	}

	private async shareGet(req: Request, res: Response) {
		if (!req.auth) return res.send(null);
		const dir = this.utils.parseQuery(req.query.dir);
		const id = this.utils.parseQuery(req.query.id);
		if (!dir || !id) return res.sendStatus(400);

		try {
			const base = join(process.cwd(), "share", `${dir}`, `${id}.svg`);
			res.sendFile(base);
		} catch (e) {
			res.status(500).json({ message: "internal server error", error: (e as any).message });
		}
	}
}
