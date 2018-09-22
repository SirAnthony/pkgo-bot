
function encode_uri_comp(s){
    return encodeURIComponent(s).replace(/%20/g, '+') }

export function qs_escape(param, opt: any = {}){
    let qs = opt.qs||''
    let sep = qs || opt.amp ? '&' : ''
    if (!param)
        return qs
    for (let i in param){
        const val = param[i]
        if (val===undefined)
            continue
        const key = encode_uri_comp(i)
        qs += sep
        if (val===null)
            qs += key;
        else if (Array.isArray(val)){
            if (!val.length)
                continue
            qs += val.map(val=>key+'='+encode_uri_comp(val)).join('&');
        } else
            qs += key+'='+encode_uri_comp(val);
        sep = '&';
    }
    return qs;
}

export function uri(url, qs, hash?){
    qs = qs_escape(qs)
    hash = hash ? '#'+qs_escape(hash) : ''
    return url+qs+hash
}
