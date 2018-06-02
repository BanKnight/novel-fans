const server = global.server
const me = server.get("locks")
const data = me.data

me.lock = async(name)=>
{
    let exist = data[name]

    if(exist == null)
    {
        data[name] = []

        return true
    }

    return new Promise((resolve)=>
    {
        exist.push(resolve)
    })
}

me.unlock = (name,result) =>
{
    let exist = data[name]

    data[name] = null

    for(let i = 0,len = exist.length;i < len;++i)
    {
        let resolve = exist[i]

        setImmediate(()=>
        {
            resolve(result)
        })
    }
}