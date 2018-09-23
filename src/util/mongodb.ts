
import * as _ from 'lodash'
import * as cookie from 'cookie'
import * as util from 'util'
import * as mongo from 'mongodb'
import * as conf from '../config'
import * as putil from './util'

let open_conns = new Map()
let __conn = {}

export interface DB {
    name: string,
    collection: mongo.Collection,
    db: mongo.Db,
    opt: any,
}


// TODO: use logger
const LOG = (str, ...args)=>console.log(util.format(str, ...args))
const ERR = (str, ...args)=>console.error(util.format(str, ...args))

function err_handler(db, type, err, selector, update?){
    ERR('MONGO_ERR: cmd: %s selector: %O\n update: %O\n%s\n%s',
        type, selector, update, err.message, err.stack)
    throw err
}

function log_query(query, name, selector, update, res){
    if (!conf.debug || !conf.debug.db)
        return LOG('Mongo debug disabled')
    LOG('mongodb %s db %s selector: %O, update: %O, res: %O', query,
        name, selector, update, res);
}

function _clean_void(obj){
    let stack = [obj];
    while (stack.length){
        let val = stack.pop();
        if (Array.isArray(val)){
            for (let item of val){
                if (item!=null&&typeof item=='object')
                    stack.push(item);
            }
        } else {
            for (let k in val){
                let item = val[k];
                if (item===undefined)
                    delete val[k];
                else if (item!=null&&typeof item=='object')
                    stack.push(item);
            }
        }
    }
    return obj;
}

async function check_db(db){
    if (typeof db=='string')
        return await open(db)
    return db
}

export async function open(name: string, conn_str?: string){
    if (__conn[name])
        return __conn[name]
    if (Array.isArray(name)){
        let ret = []
        for (let db of name)
            ret.push(await open(db, conn_str))
        return ret
    }
    conn_str = conn_str||conf.db.conn
    return __conn[name] = await connect(conn_str, name)
}

export async function find_one(db, selector, _opt: any = {}){
    if (typeof db=='string')
        db = await open(db)
    selector = selector||{}
    const read_preference = _opt.read_preference
    let opt = !_opt ? {} : _.omit(_opt, 'read_preference')
    if (read_preference)
        opt.readPreference = new mongo.ReadPreference(read_preference, null)
    return await try_mongo(db, 'findOne', selector, opt)
}

export async function find_all(db, selector = {}, opt: any = {}){
    if (typeof db=='string')
        db = await open(db)
    let cursor = db.collection.find(selector);
    if (opt.hint)
        cursor.hint(opt.hint);
    if (opt.projection)
        cursor.project(opt.projection);
    if (opt.sort)
        cursor.sort(opt.sort);
    if (opt.limit)
        cursor.limit(opt.limit);
    if (opt.skip)
        cursor.skip(opt.skip);
    let items;
    try { items = await cursor.toArray(); }
    catch(e){ err_handler(db, 'toArray', e, {selector, opt}); }
    log_query('toArray', db.name, {selector, opt}, null, items);
    return items;
}

export function find(db, selector, opt){
    if (typeof db=='string')
        throw new Error('Cannot open db from mongodb.find')
    selector = selector||{}
    let args = [selector]
    if (opt)
        args.push(opt)
    let cursor = db.collection.find.apply(db.collection, args)
    cursor.selector = selector
    cursor._cdb = db
    return cursor
}

async function try_mongo(db: DB, cmd, selector?, update?, ...args){
    let res
    try { res = await db.collection[cmd](selector, update, ...args) }
    catch(e){ err_handler(db, cmd, e, selector, update) }
    log_query(cmd, db.name, selector, update, res)
    return res
}

export async function update(db, selector, update, opt: any ={upsert: true}){
    db = await check_db(db)
    selector = selector||{}
    if (opt.del_undef)
        _clean_void(update)
    return await try_mongo(db, 'update', selector, update, opt)
}

export async function save(db, obj){
    db = await check_db(db)
    let res = await try_mongo(db, 'save', obj);
    return res._id;
}

export async function insert(db, obj, opt: any = {}){
    db = await check_db(db)
    if (opt.del_undef)
        _clean_void(obj)
    return await try_mongo(db, 'insert', obj)
}

export async function remove(db, selector={}){
    db = await check_db(db)
    return await try_mongo(db, 'remove', selector)
}

export async function count(db, selector={}){
    db = await check_db(db)
    return await try_mongo(db, 'count', selector)
}

export async function disconnect(db){
    db = await check_db(db)
    return await db.db.close()
}

async function connect(conn, collection){
    const opt = Object.assign({host: 'localhost', port: 27017},
        conn instanceof Object ? conn : cookie.parse(conn||''))
    let ret = <DB>{opt};
    let hosts = opt.host+':'+opt.port, host
    for (let i=1; host = opt['host'+i]; i++)
        hosts += ','+host+':'+(opt['port'+i]||'27017')
    let url_opts = {}
    const url_opts_keys = ['w', 'maxPoolSize', 'readPreference', 'replicaSet']
    for (let k of url_opts_keys)
        url_opts[k] = opt[k]
    const url = putil.uri('mongodb://'+hosts+'/'+opt.db, url_opts)
    let config: mongo.MongoClientOptions = {
        connectTimeoutMS: +opt.connect_timeout_ms||90000,
        socketTimeoutMS: 24*3600000,
        keepAlive: true,
        autoReconnect: opt.auto_reconnect ? !!+opt.auto_reconnect : true,
        useNewUrlParser: true,
    }
    if (!config.autoReconnect)
        config.bufferMaxEntries = 0
    else if (opt.buffer_max_entries)
        config.bufferMaxEntries = +opt.buffer_max_entries
    try {
        const client = await mongo.MongoClient.connect(url, config)
        ret.db = client.db()
    } catch(e){
        ERR('Failed opening db %s/%s %s\n%s', opt.db, collection, e.message,
            e.stack)
        throw e
    }
    // handle disconnect
    ret.db.serverConfig.on('close', err=>LOG(err))
    ret.db.on('close', ()=>open_conns.delete(ret.db))
    open_conns.set(ret.db, Object.assign({collection}, opt))
    if (collection===undefined)
        return ret
    try { ret.collection = await ret.db.collection(collection) }
    catch(e){
        ERR('Failed opening collection %s/%s %s\n%s', opt.db, collection,
            e.message, e.stack)
        throw e
    }
    LOG('opened collection %s', collection)
    ret.name = opt.db+':'+collection
    return ret
}

async function ensure_index(db, collection, index, opt: any = {}){
    db = await check_db(db)
    return await db.db.ensureIndex(collection, index, opt)
}

export async function create_collection(db, collection, indexes, opt){
    db = await check_db(db)
    const col = await db.db.createCollection(collection, opt)
    if (!indexes)
        return col
    for (let idx of indexes)
        await ensure_index(db, collection, idx)
    return col
}

export async function drop_collection(db){
    db = await check_db(db)
    return await try_mongo(db, 'drop')
}
