import {Commander} from './base'
import {User} from '../entity/user'
import {Pok} from '../entity/pok'

export class Dex extends Commander {
    commands = ['dex']
    async command_dex(msg){
        let pok = await Pok.get(msg.args[0])
        if (!pok)
            return this.reply('Not found', msg)
        if (!Array.isArray(pok))
            pok = [pok]
        for (let p of pok){
            this.reply(`<b>${p.name}</b>: (#${p.id})\n`+
                `cp: ${p.cp}`, msg)
        }
    }
}
