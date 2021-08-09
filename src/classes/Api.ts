import prClient from "../client/client";
import express, { NextFunction, Request, Response, Router } from "express";
import { join } from "path";
import cors from "cors";
import FormData from "form-data";
import fetch from "node-fetch";
import cookieParser from "cookie-parser";
import { unlink, readdir, readFile, rename, stat } from "fs/promises";

export default class Api {
	public server = express();
	public apiRouter = Router();
	protected cache = new Map<string, any>();

	constructor(public client: prClient) {
		this.apiRouter
			.get("/user", this.authenticated, async (req, res) => await this.getUser(req, res))
			.get("/messages", this.authenticated, async (req, res) => await this.messages(req, res))
			.get(
				"/transcripts",
				this.authenticated,
				async (req, res) => await this.getTranscripts(req, res)
			)
			.get("/login", (req, res) => {
				if (req.query.redirect)
					res.cookie("redirect", decodeURIComponent(req.query.redirect.toString()));
				res.redirect(process.env.DISCORD_AUTH);
			})
			.get("/logout", (_, res) => res.clearCookie("accesstoken").redirect(process.env.DASHBOARD))
			.get("/callback", async (req, res) => await this.callback(req, res));

		this.server
			.use(cookieParser())
			.use(
				cors({
					credentials: true,
					origin: [
						"http://localhost:3000",
						"https://peppleton.daangamesdg.tk",
						"https://peppleton-transcript.marcusn.co.uk",
						"https://peppleton-share.marcusn.co.uk",
						
					],
				})
			)
			.use("/api", this.apiRouter)
			.get("/:id", this.authenticated, async (req, res) => await this.getTranscript(req, res))
			.put("/:id/change", this.authenticated, async (req, res) => await this.changeName(req, res))
			.delete(
				"/:id/change",
				this.authenticated,
				async (req, res) => await this.deleteFile(req, res)
			)
			.get("*", (_, res) => res.redirect("https://www.roblox.com/groups/6651302"));
	}

	public authenticated(req: Request, res: Response, next: NextFunction) {
		if (!req.headers || req.headers.authorization !== process.env.AUTH_KEY)
			return res.status(401).send("401 - unauthorized");
		next();
	}

	public start(port = 80, callback: () => void = () => null) {
		this.server.listen(port, callback);
	}

	private async messages(req: Request, res: Response) {
		try {
			const data = (
				await Promise.all(
					this.client.activityManager.cache
						.filter((stats) => stats.guildId === process.env.GUILD)
						.map(async (stats) => {
							return {
								...stats,
								messagesAmount: stats.messages.length,
								user: (await this.client.utils.fetchUser(stats.userId)).tag,
							};
						})
				)
			).sort((a, b) => b.messages.length - a.messages.length);

			res.status(200).send(data);
		} catch (e) {
			this.client.log("ERROR", `Api#messages error: \`\`\`${e.stack || e.message}\`\`\``);
			res.status(500).json({ message: "internal server error", error: e.message });
		}
	}

	private async deleteFile(req: Request, res: Response) {
		try {
			if (!req.params.id) return res.send(null);
			await unlink(join(process.cwd(), "transcripts", `${req.params.id}.html`));
			res.status(204).send("");
		} catch (e) {
			this.client.log("ERROR", `Api#deleteFile error: \`\`\`${e.stack || e.message}\`\`\``);
			res.status(500).json({ message: "internal server error", error: e.message });
		}
	}

	private async changeName(req: Request, res: Response) {
		try {
			if (!req.params.id || !req.query.name) return res.send(null);
			const file = await rename(
				join(process.cwd(), "transcripts", `${req.params.id}.html`),
				join(process.cwd(), "transcripts", `${(req.query.name as string).split(".")[0]}.html`)
			);
			res.send(file);
		} catch (e) {
			this.client.log("ERROR", `Api#changeName error: \`\`\`${e.stack || e.message}\`\`\``);
			res.status(500).json({ message: "internal server error", error: e.message });
		}
	}

	private async getTranscripts(req: Request, res: Response) {
		try {
			const filesNames = await readdir(join(process.cwd(), "transcripts"));
			const files = (
				await Promise.all(
					filesNames.map(async (f) => {
						return {
							f,
							date: (await stat(join(process.cwd(), "transcripts", f))).birthtimeMs,
						};
					})
				)
			)
				.sort((a, b) => b.date - a.date)
				.map(({ f }) => f);

			res.send(files);
		} catch (e) {
			res.status(500).json({ message: "internal server error", error: e.message });
		}
	}

	private async getTranscript(req: Request, res: Response) {
		try {
			const file = await readFile(
				join(process.cwd(), "transcripts", `${req.params?.id}.html`)
			).catch((e) => null);
			if (file) res.sendFile(join(process.cwd(), "transcripts", `${req.params?.id}.html`));
			else res.send(null);
		} catch (e) {
			res.status(500).json({ message: "internal server error", error: e.message });
		}
	}

	private async getUser(req: Request, res: Response) {
		try {
			const token = req.cookies?.accesstoken;
			if (!token) return res.send(null);

			let data = this.cache.get(`${token}-user`);

			if (!data) {
				data = await (
					await fetch(`https://discord.com/api/v8/users/@me`, {
						method: "get",
						headers: {
							Authorization: `Bearer ${token}`,
						},
					})
				).json();

				this.cache.set(`${token}-user`, data);
				setTimeout(() => this.cache.delete(`${token}-user`), 5e3);
			}

			const guild = this.client.guilds.cache.get(process.env.GUILD);
			const member = await this.client.utils.fetchMember(data.id, guild);
			res.send({
				...data,
				valid: member
					? member.hasPermission("VIEW_AUDIT_LOG", { checkAdmin: true, checkOwner: true })
					: false || this.client.isOwner(data.id),
				supervisor: member.hasPermission("MANAGE_MESSAGES", { checkAdmin: true, checkOwner: true }),
				admin: this.client.isOwner(data.id),
			});
		} catch (e) {
			this.client.log("ERROR", `Api#user error: \`\`\`${e}\`\`\``);
			res.status(500).json({ message: "internal server error", error: e.message });
		}
	}

	private async callback(req: Request, res: Response) {
		const { code } = req.query;
		if (!code) return res.status(400).send("bad request");

		try {
			const data = await (
				await fetch(`https://discord.com/api/v8/oauth2/token`, {
					method: "POST",
					body: this.getAuthBody(code as string),
				})
			).json();

			if (data.error) throw new Error(data.error_description);
			res.cookie("accesstoken", data.access_token, {
				maxAge: data.expires_in * 1000,
			});

			const redirect = req.cookies.redirect;
			res.redirect("https://peppleton-transcript.marcusn.co.uk");
		} catch (e) {
			res.status(500).json({ message: "internal server error", error: e.message });
		}
	}

	private getAuthBody(code: string) {
		const form = new FormData();
		form.append("client_id", this.client.user.id);
		form.append("client_secret", process.env.CLIENT_SECRET);
		form.append("grant_type", "authorization_code");
		form.append("redirect_uri", process.env.REDIRECT);
		form.append("scope", "identify");
		form.append("code", code);

		return form;
	}
}
