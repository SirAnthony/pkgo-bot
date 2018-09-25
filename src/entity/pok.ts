import * as TelegramBot from 'node-telegram-bot-api'
import * as mongodb from '../util/mongodb'
import * as chars from '../chars.json'

const by_number: {[key: number]: Pok} = {}
const by_name = {}
let pok_db;

async function get_pok_id(id: number){
    if (id in by_number)
        return by_number[id]
    if (!pok_db)
        pok_db = await mongodb.open('poks')
    let res = await mongodb.find_one(pok_db, {id})
    if (!res)
        return by_number[id] = null
    return by_number[id] = new Pok(res)
}

async function get_pok_name(name: string, opt?: any){
    let id = by_name[name]
    if (id===null)
        return null
    if (Array.isArray(id)){
        let p: Array<Pok> = []
        for (let num of id)
            p.push(await get_pok_id(num))
        return p
    } else if (id)
        return await get_pok_id(id)
    if (!pok_db)
        pok_db = await mongodb.open('poks')
    let res = await mongodb.find_one(pok_db, {name:
        {$regex: `^${name}$`, $options: 'i'}})
    if (res){
        by_name[name] = res.id
        if (res.id in by_number)
            return by_number[res.id]
        return by_number[res.id] = new Pok(res)
    }
    res = await mongodb.find_all(pok_db, {name:
        {$regex: name, $options: 'i'}})
    if (!res)
        return by_name[name] = null
    by_name[name] = res.map(f=>f.id)
    let ret = []
    for (let r of res){
        if (opt && opt.valid && r.id>9000)
            continue
        if (!(r.id in by_number))
            by_number[r.id] = new Pok(r)
        ret.push(by_number[r.id])
    }
    return ret
}

export class Pok {
    info: any
    static async get(q: string, opt?: any){
        if (/^\d+$/.test(q))
            return await get_pok_id(+q)
        return await get_pok_name(q, opt)
    }
    constructor(info){
        this.info = info
    }
    range(val){ return val.min+'-'+val.max }
    weather(val?: Array<string>){
        const w = val||this.info.weather
        return w ? w.map(v=>chars.weather[v]).join('') : ''
    }
    get raid_data(){
        const p = this.info
        return `Name: *${p.name}* (#${p.id})\n`+
            `weather: ${this.weather()}\n`+
            `cp: ${this.range(p.raid.cp)}\n`+
            `weather cp: ${this.range(p.raid.weather)}`

    }
}
