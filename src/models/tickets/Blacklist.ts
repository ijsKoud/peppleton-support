import { Schema, Document, model } from "mongoose";
import { strings } from "../interfaces";

interface iBlacklist extends Document {
	userId: string;
	type?: ("suggestion" | "ticket" | "report")[];
}

export default model<iBlacklist>(
	"blacklist",
	new Schema<iBlacklist>({
		userId: strings.required,
		type: { type: Array, required: false },
	})
);
