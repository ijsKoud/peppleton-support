import { Schema, Document, model } from "mongoose";
import { numbers, strings } from "../interfaces";

interface iTicket extends Document {
	status: "unclaimed" | "closed" | "open";
	userId: string;
	caseId: string;
	lastMsg?: number;
	channelId?: string;
	messageId?: string;
	claimerId?: string;
}

export default model<iTicket>(
	"ticket",
	new Schema<iTicket>({
		status: strings.required,
		userId: strings.required,
		caseId: strings.required,
		lastMsg: numbers.optional,
		channelId: strings.optional,
		messageId: strings.optional,
		claimerId: strings.optional,
	})
);
