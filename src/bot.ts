import { config } from "dotenv";
import Client from "./client/client";
config();

const client = new Client({ ownerID: ["304986851310043136"] });
client.start();
