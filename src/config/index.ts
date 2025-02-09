import dotenv from 'dotenv';
dotenv.config();

export const key = process.env.KEY || 'test';

export const serverUrl = process.env.SERVER_URL || '';

export const tgBot = process.env.TG_BOT || '';

export const tgChannel = process.env.TG_CHANNEL || '';

export const port = Number(process.env.PORT || 3000);

export const wsPort = Number(process.env.WS_PORT || '');
