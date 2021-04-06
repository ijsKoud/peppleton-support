import express from "express";
import { join } from "node:path";
import prClient from "../client/client";

export default class Api {
	public server = express();

	constructor(public client: prClient) {
		this.server.get("/", (req, res) => res.status(200));
		this.server.get("/:id", async (req, res) => {
			const { id } = req.params;
			res.sendFile(join(__dirname, "..", "..", "transcripts", `${id}.html`));
		});
	}

	public start() {
		this.server.listen(443, () => this.client.log("INFO", "Api is running on port `443`!"));
	}
}
