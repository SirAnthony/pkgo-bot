
import * as mongodb from '../util/mongodb'
import * as TelegramBot from 'node-telegram-bot-api'

let user_db, users_cache = {}

export class User {
    static async get(info: TelegramBot.User){
        if (info.id in users_cache)
            return users_cache[info.id]
        const user = new User()
        try { await user.load(info) }
        catch(e){
            console.error(e.stack)
            return null
        }
        return users_cache[info.id] = user
    }
    async load(info: TelegramBot.User){
        if (!user_db)
            user_db = await mongodb.open('users')
        let res = await mongodb.find_one(user_db, {id: info.id})
        if (!res){
            await mongodb.insert(user_db, info)
            res = info
        }
        return res
    }
}

