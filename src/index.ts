
import * as TelegramBot from 'node-telegram-bot-api'
import * as conf from './config'
import {Commands} from './commands'

process.on('unhandledRejection', err=>
  console.error(err.message+'\n', err.stack));

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(conf.token, {polling: true});
const cmd = new Commands(bot)
