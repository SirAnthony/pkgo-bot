
import {Commander} from './base'
import {get_user} from '../entity/user'

export class CmdUser extends Commander {
    commands = ['register']
    async command_register(args, msg){
        const user = await get_user(msg.from)
        this.reply('no', msg);
    }
}
