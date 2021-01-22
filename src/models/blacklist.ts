import { model, Schema } from "mongoose";

const reqString = { required: true, type: String };
const schema = new Schema({
	id: reqString,
	endDate: { type: Number, required: true },
});
const blacklist = model("blacklist", schema);
export default blacklist;
