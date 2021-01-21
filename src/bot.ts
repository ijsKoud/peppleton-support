import { owners, token } from './client/config';
import botClient from './client/client';

const client: botClient = new botClient({ token, owners });
client.start();