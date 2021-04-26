import { strings } from "../interfaces";
import { Schema, Document, model } from "mongoose";

interface iStats extends Document {
	userId: string;
	guildId: string;
	messages: number[];
}

export default model<iStats>(
	"stats",
	new Schema({
		userId: strings.required,
		guildId: strings.required,
		messages: { type: Array, required: true, default: [] },
	})
);
