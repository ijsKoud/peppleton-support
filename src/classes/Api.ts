import prClient from "../client/client";
import express from "express";
import { join } from "path";

export default class Api {
	public server = express();
	constructor(public client: prClient) {
		this.server
			.get("*", (req, res) => res.redirect("https://www.roblox.com/groups/6651302"))
			.get("/:id", (req, res) =>
				res.sendFile(join(__dirname, "..", "..", "transcripts", `${req.params?.id}.html`), (e) =>
					res.redirect("/")
				)
			);
	}

	public start(port = 80, callback: () => void = () => null) {
		this.server.listen(port, callback);
	}
}
