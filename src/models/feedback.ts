import { model, Schema } from "mongoose";

const reqString = { required: true, type: String };
const schema = new Schema({
	message: reqString,
});
const feedback = model("feedback", schema);
export default feedback;
