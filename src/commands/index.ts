import * as TelegramBot from 'node-telegram-bot-api'
import * as conf from '../config'
import {Messager} from './base'
import {CmdUser} from './user'

let cmd_types = {
    base: Messager,
}
let cmd_private = [CmdUser]

export class Commands {
    chats: any
    private: Array<any>

    constructor(bot: TelegramBot){
        this.init_chats(bot)
        this.init_private(bot)
        bot.on('message', this.on_message.bind(this))
    }
    init_chats(bot: TelegramBot){
        this.chats = {}
        const {chats = []} = conf
        for (let c of chats){
            const types = c.types||[]
            const chat = this.chats[c.id] = this.chats[c.id]||[]
            if (!types.length)
                continue
            for (let t of types){
                const cls = cmd_types[t]||cmd_types.base
                const instance = new cls(bot, c.id)
                chat.push(instance)
            }
        }
    }
    init_private(bot: TelegramBot){
        this.private = []
        for (let t in cmd_types)
            this.private.push(new cmd_types[t](bot))
        for (let p of cmd_private)
            this.private.push(new p(bot))
    }
    async on_message(msg){
        console.log('MSG: '+JSON.stringify(msg))
        const cmds = msg.chat.type=='private' ?
            this.private : this.chats[msg.chat.id]
        const is_cmd = msg.text.startsWith('/')
        for (let c of cmds){
            if (is_cmd && c.type!='cmd' || (!is_cmd && c.type=='cmd'))
                continue
            await c.process(msg)
        }
    }
}
