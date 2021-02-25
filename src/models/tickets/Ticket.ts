import { Schema, Document, model } from "mongoose";
import { nString, reqString } from "../interfaces";

interface iTicket extends Document {
	status: "unclaimed" | "closed" | "open";
	userId: string;
	lastMsg: number;
	caseId: string;
	channelId?: string;
	messageId?: string;
	claimerId?: string;
}

export default model<iTicket>(
	"ticket",
	new Schema<iTicket>({
		status: reqString,
		userId: reqString,
		lastMsg: { required: false, type: Number },
		caseId: reqString,
		channelId: nString,
		messageId: nString,
		claimerId: nString,
	})
);
