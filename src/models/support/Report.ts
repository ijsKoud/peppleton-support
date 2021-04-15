import { Schema, Document, model } from "mongoose";
import { strings } from "../interfaces";

interface iReport extends Document {
	userId: string;
	caseId: string;
	channelId: string;
	messageId: string;
}

export default model<iReport>(
	"report",
	new Schema<iReport>({
		userId: strings.required,
		caseId: strings.required,
		channelId: strings.required,
		messageId: strings.required,
	})
);
