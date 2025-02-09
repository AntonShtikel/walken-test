import TelegramBot from 'node-telegram-bot-api';
import { tgBot, tgChannel } from '../config';

const bot = new TelegramBot(tgBot, { polling: true });
export async function sendMessage(message: any): Promise<void> {
  const channel = `@${tgChannel}`;
  try {
    await bot.sendMessage(channel, message, { parse_mode: 'HTML' });
  } catch (error) {
    console.log(error);
  }
}
