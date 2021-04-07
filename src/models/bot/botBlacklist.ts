import { strings } from "../interfaces";
import { Schema, Document, model } from "mongoose";

interface iBotBlacklist extends Document {
	userId?: string;
	guildId?: string;
}

export default model<iBotBlacklist>(
	"botBlacklist",
	new Schema({
		userId: strings.optional,
		guildId: strings.optional,
	})
);
