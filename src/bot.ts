import { config } from "dotenv";
import Client from "./client/client";
config();

new Client({ ownerID: ["304986851310043136"] }).start();
