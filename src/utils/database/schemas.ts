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
