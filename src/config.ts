import * as secrets from '../secrets.json'

const conf = Object.assign({
    chats: [],
    processors: {many: false},
    debug: {db: true},
    db: {
        conn: 'host=localhost;db=pogo'
    },
}, secrets)
export = conf
