
import * as TelegramBot from 'node-telegram-bot-api'

export interface Message {
    id: number,
    private: boolean,
    type: string,
    text: string,
    cmd: string,
    args: Array<string>,
    user: TelegramBot.User,
    msg: TelegramBot.Message,
}

export class Base {
    bot: TelegramBot
    id: number

    constructor(bot: TelegramBot, id?: number){
        this.bot = bot
        this.id = id
    }
    get type(){
        if (this instanceof Commander)
            return 'cmd'
        if (this instanceof Messager)
            return 'msg'
        return 'base'
    }
    acceptable(msg: Message){ return true }
    reply(text, msg: Message){
        const id = this.id||msg.id
        this.bot.sendMessage(id, text)
    }
    command_echo(msg){
        this.reply(msg.args.join(' '), msg) }
}

export class Messager extends Base {
    acceptable(msg: Message){ return !msg.text.startsWith('/') }
    process(msg){
        if (this.acceptable(msg))
            this.reply('Message received', msg)
    }
}

export class Commander extends Base {
    commands: Array<string>

    acceptable(msg: Message){
        return msg.cmd && this.commands.includes(msg.cmd) }
    async process(msg: Message){
        if (this.acceptable(msg))
            return await this[`command_${msg.cmd}`](msg)
    }
    cmd_error(info, cmd, msg){
        if (msg.private)
            this.reply(`Command error: ${cmd}: ${info}`, msg)
    }
}
