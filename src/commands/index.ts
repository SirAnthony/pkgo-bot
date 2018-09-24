import * as TelegramBot from 'node-telegram-bot-api'
import * as conf from '../config'
import * as CmdBase from './base'
import {CmdUser} from './user'
import {Dex} from './dex'

let cmd_types = {
    base: CmdBase.Messager,
    dex: Dex,
}
let cmd_private = [CmdUser, Dex]

class Chat {
    cmd: Array<CmdBase.Commander>
    msg: Array<CmdBase.Messager>
    push(ist: CmdBase.Base){
        const t = ist.type
        const arr = this[t] = this[t]||[]
        this[t].push(ist)
    }
    processor(msg: CmdBase.Message){
        const chat = this[msg.type]
        const processors = chat.filter(c=>c.acceptable(msg))
        if (processors.length && !conf.processors.many)
            return [processors.shift()]
        return processors
    }
}

export class Commands {
    chats: {[key: number]: Chat}
    private: Chat
    bot: TelegramBot
    me: TelegramBot.User

    constructor(bot: TelegramBot){
        this.bot = bot
        this.init_chats(bot)
        this.init_private(bot)
        bot.on('message', this.on_message.bind(this))
    }
    init_chats(bot: TelegramBot){
        this.chats = {}
        const {chats = []} = conf
        for (let c of chats){
            const types = c.types||[]
            if (!types.length)
                continue
            const chat = this.chats[c.id] = this.chats[c.id] || new Chat()
            for (let t of types){
                const cls = cmd_types[t]||cmd_types.base
                chat.push(new cls(bot, c.id))
            }
        }
    }
    init_private(bot: TelegramBot){
        this.private = new Chat()
        for (let t in cmd_types)
            this.private.push(new cmd_types[t](bot))
        for (let p of cmd_private)
            this.private.push(new p(bot))
    }
    parse(msg: TelegramBot.Message){
        if (!msg.text)
            return
        let ret = <CmdBase.Message>{msg, id: msg.chat.id,
            user: msg.from, text: msg.text, type: 'msg',
            private: msg.chat.type=='private'}
        const parts = msg.text.split(' ')
        if (parts.length && parts[0].startsWith('/')){
            const [cmd, ...args] = parts
            ret.type = 'cmd'
            ret.cmd = cmd.slice(1)
            ret.args = args||[]
            const mention = cmd.indexOf('@')
            if (mention>=0){
                const user = cmd.slice(mention+1)
                if (user!=this.me.username)
                    return null
                ret.cmd = cmd.slice(0, mention)
            }
            if (!ret.cmd)
                return null
        }
        return ret
    }
    async on_message(message: TelegramBot.Message){
        if (!this.me)
            this.me = await this.bot.getMe()
        console.log('MSG: '+JSON.stringify(message))
        const msg = this.parse(message)
        if (!msg)
            return
        const chat = msg.private ? this.private : this.chats[msg.id]
        for (let c of chat.processor(msg))
            await c.process(msg)
    }
}
