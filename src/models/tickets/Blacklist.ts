import { Schema, Document, model } from "mongoose";
import { reqString } from "../interfaces";

interface iBlacklist extends Document {
	userId: string;
	guildId: string;
}

export default model<iBlacklist>(
	"blacklist",
	new Schema<iBlacklist>({
		guildId: reqString,
		userId: reqString,
	})
);
