import { Schema, Document, model } from "mongoose";
import { strings } from "../interfaces";

interface iFeedback extends Document {
	guildId: string;
	messageId: string;
}

export default model<iFeedback>(
	"feedback",
	new Schema<iFeedback>({
		guildId: strings.required,
		messageId: strings.required,
	})
);
