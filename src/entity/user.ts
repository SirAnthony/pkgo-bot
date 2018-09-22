
import * as mongodb from '../util/mongodb'
import * as TelegramBot from 'node-telegram-bot-api'

let user_db, users_cache = {}

export async function get_user(info: TelegramBot.User){
    if (info.id in users_cache)
        return users_cache[info.id]
    const user = new User()
    await user.load(info)
    return users_cache[info.id] = user
}

export class User {
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

