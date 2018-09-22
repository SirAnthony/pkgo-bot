
import * as TelegramBot from 'node-telegram-bot-api'

class Base {
    bot: TelegramBot
    id: number

    constructor(bot: TelegramBot, id?: number){
        this.bot = bot
        this.id = id
    }
    reply(text, msg: any = {}){
        const id = this.id||msg.chat.id
        this.bot.sendMessage(id, text)
    }
    command_echo(args, msg){
        this.reply(args.join(' '), msg) }
}

export class Messager extends Base {
    type = 'msg'
    process(msg){
        if (msg.text.startsWith('/'))
            return
        this.reply('Message received', msg)
    }
}

export class Commander extends Base {
    commands: Array<string>
    type = 'cmd'

    async process(msg){
        const {text} = msg
        // TODO: use entities
        if (!text.startsWith('/'))
            return
        const [cmd, ...args] = text.slice(1).split(' ')
        if (!this.commands.includes(cmd))
            return this.cmd_error('No such command', cmd, msg)
        return await this[`command_${cmd}`](args, msg)
    }
    cmd_error(info, cmd, msg){
        if (msg.chat.type=='private')
            this.reply(`Command error: ${cmd}: ${info}`, msg)
    }
}
