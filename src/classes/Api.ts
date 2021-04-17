import prClient from "../client/client";
import express from "express";
import { join } from "path";

export default class Api {
	public server = express();
	constructor(public client: prClient) {
		this.server
			.get("/:id", (req, res) =>
				res.sendFile(join(process.cwd(), "transcripts", `${req.params?.id}.html`))
			)
			.get("*", (req, res) => res.redirect("https://www.roblox.com/groups/6651302"));
	}

	public start(port = 80, callback: () => void = () => null) {
		this.server.listen(port, callback);
	}
}
