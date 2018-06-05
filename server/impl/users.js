const config = global.config

const server = global.server

const me = server.get("users")
const data = me.data

me.start = function()
{
    return true
}

me.get = function(id)
{
    return data[id]
}

me.set = function(id,val)
{
    data[id] = val
}

me.destroy = function(id)
{
    delete data[id]
}