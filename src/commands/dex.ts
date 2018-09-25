import {Commander} from './base'
import {User} from '../entity/user'
import {Pok} from '../entity/pok'

export class Dex extends Commander {
    commands = ['dex']
    async command_dex(msg){
        let pok = await Pok.get(msg.args[0], {valid: true})
        if (!pok)
            return this.reply('Not found', msg)
        if (!Array.isArray(pok))
            pok = [pok]
        if (pok.length>1)
            this.reply(`Found ${pok.length} entries, use page number`, msg)
        if (pok.length<1)
            this.reply('Not found', msg)
        const page = msg.args[1]||0
        const per_page = msg.private ? 5 : 1
        pok = pok.slice(per_page*page, per_page+page*per_page)
        for (let p of pok){
            this.reply(p.raid_data, msg, {parse_mode: 'Markdown'})
        }
    }
}
