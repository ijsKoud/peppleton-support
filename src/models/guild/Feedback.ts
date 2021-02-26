import { Schema, Document, model } from "mongoose";
import { reqString } from "../interfaces";

interface iFeedback extends Document {
	guildId: string;
	messageId: string;
}

export default model<iFeedback>(
	"feedback",
	new Schema<iFeedback>({
		guildId: reqString,
		messageId: reqString,
	})
);
