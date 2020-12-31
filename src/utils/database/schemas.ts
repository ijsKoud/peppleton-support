import { model, Schema } from "mongoose";

const stringType = {
	type: String,
	required: true,
};

export const ticketTimeout = model(
	"ticketTimeouts",
	new Schema({
		channelId: stringType,
		lastMsg: { required: true, type: Number },
	})
);

export const blacklist = model(
	"ticketblacklists",
	new Schema({
		userId: stringType,
		endDate: { required: true, type: Date },
	})
);
