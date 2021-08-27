import { NextFunction, Request, Response } from "express";
import Client from "../../../Client";
import Utils from "../utils";

export class AuthMiddleware {
	private readonly cookieName: string = "PEPPLETON_AUTH";
	private utils: Utils;

	constructor(public client: Client) {
		this.utils = new Utils(client);
	}

	private run(req: Request, res: Response, next: NextFunction) {
		const authorization = req.cookies[this.cookieName];
		if (authorization) {
			req.auth = this.utils.decrypt(authorization);
			if (!req.auth) res.clearCookie(this.cookieName);

			if (req.auth && req.auth.expires < Date.now()) req.auth = null;
		} else {
			req.auth = null;
		}

		next();
	}

	public get middleware() {
		return this.run.bind(this);
	}
}
