import { config } from "dotenv";
import prClient from "./client/client";
config();

new prClient({
	ownerID: ["304986851310043136", "517069063701266474", "698564108844400694"],
}).start();
