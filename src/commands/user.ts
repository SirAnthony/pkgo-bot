
import {Commander} from './base'
import {User} from '../entity/user'

export class CmdUser extends Commander {
    commands = ['start', 'register']
    async command_start(msg){
        // Register new user
        this.reply('Hello, I cannot do anything', msg)
        await User.get(msg.user)
        this.reply('You was counted anyway. '+
            'Remember, I see what you did there', msg)
    }
    async command_register(msg){
        const user = await User.get(msg.user)
        if (!user)
            return this.reply('no', msg)
        return this.reply('registration ok', msg)
    }
}
