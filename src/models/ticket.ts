import { model, Schema } from "mongoose";

const reqString = { required: true, type: String };
const schema = new Schema({
	channelId: reqString,
	userId: reqString,
	lastMessage: { required: true, type: Number, default: Date.now() },
});
const ticket = model("ticket", schema);
export default ticket;
