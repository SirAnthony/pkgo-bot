import * as mongodb from '../util/mongodb'

const by_number: {[key: number]: Pok} = {}
const by_name = {}
let pok_db;

function get_pok_id(id: number){
    if (id in by_number)
        return by_number[id]
    if (!pok_db)
        pok_db = await mongodb.open('poks')
    let res = await mongodb.find_one(pok_db, {id})
    return by_number[id] = new Pok(res)
}

function get_pok_name(name: string){
    let id = by_name[name]
    if (id===null)
        return null
    if (Array.isArray(id)){
        let p = []
        for (let p of id)
            p.push(await get_pok_id(id))
        return p
    } else if (id)
        return await get_pok_id(id)
    let res = await mongodb.find_one(pok_db, {name})
    if (res){
        by_name[name] = res.id
        if (res.id in by_number)
            return by_number[res.id]
        return by_number[res.id] = new Pok(res)
    }
    res = await mongodb.find_all(pok_db, {name: {$match: name}})
    if (!res){
        return by_name[name] = null
    by_name[name] = res.map(f=>f.id)
    let ret = []
    for (let r of ret){
        if (!(r.id in by_number))
            by_number[r.id] = new Pok(r)
        ret.push(by_number[r.id])
    }
    return ret
}

export class Pok {
    info: any
    static async function get(q: number|string, user: TelegramBot.User){
        if (typeof q=='string')
            return await get_pok_name(q, user)
        return await get_pok_id(q, user)
    }
    constructor(info){
        this.info = info
    }
}
