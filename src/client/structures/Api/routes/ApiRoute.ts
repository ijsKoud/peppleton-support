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
			.get("/activity", this.check.bind(this), this.activity.bind(this)) // get activity
			.get("/transcripts", this.check.bind(this), this.transcripts.bind(this)) // get transcripts
			.get("/transcript", this.check.bind(this), this.transcriptGet.bind(this)) // get transcript
			.patch("/transcript", this.check.bind(this), this.transcriptPatch.bind(this)) // update transcript
			.delete("/transcript", this.check.bind(this), this.transcriptDelete.bind(this)); // delete transcript
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
			res.status(500).json({ message: "internal server error", error: e.message });
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
			res.status(500).json({ message: "internal server error", error: e.message });
		}
	}

	private async activity(req: Request, res: Response) {
		if (!req.auth) return res.send(null);

		try {
			const stats = this.client.activityManager.cache.map((act) => ({
				id: act.id,
				messages: act.messages.length,
				voice: ms(act.voice.length * this.client.constants.activity.duration, { long: true }),
			}));

			res.send(stats);
		} catch (e) {
			res.status(500).json({ message: "internal server error", error: e.message });
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
			res.status(500).json({ message: "internal server error", error: e.message });
		}
	}

	private async transcriptGet(req: Request, res: Response) {
		if (!req.auth) return res.send(null);
		const id = this.utils.parseQuery(req.query.id);
		if (!id) return res.sendStatus(400);

		try {
			const base = join(process.cwd(), "transcripts", id);
			const file = await readFile(base, "utf-8");

			res.send(file);
		} catch (e) {
			res.status(500).json({ message: "internal server error", error: e.message });
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
			res.status(500).json({ message: "internal server error", error: e.message });
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
			res.status(500).json({ message: "internal server error", error: e.message });
		}
	}
}
