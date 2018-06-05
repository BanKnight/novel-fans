
const server = global.server

const md_db = server.get("db")

const me = server.get("sessions")
const data = me.data

me.start = async function()
{
    console.log("start to load sessions")

    const sessions = await md_db.load("sessions")

    for(var i = 0,len = sessions.length;i < len;++i)
    {
        var db_one = sessions[i]

        data[db_one._id] = db_one.val
    }

    console.log("finish loading sessions")
    console.dir(data)

    return true
}

me.get = async function(id)
{
    return data[id]
}

me.set = async function(id,val)
{
    data[id] = val

    md_db.upsert("sessions",{_id:id},{val : val})
}

me.destroy = async function(id)
{
    delete data[id]

    md_db.remove("sessions",{_id:id})
}