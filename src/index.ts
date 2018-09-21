
import * as TelegramBot from 'node-telegram-bot-api'
import * as conf from './config'
import {Commands} from './commands'


// replace the value below with the Telegram token you receive from @BotFather
const token = 'YOUR_TELEGRAM_BOT_TOKEN';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(conf.token, {polling: true});
const cmd = new Commands(bot)
