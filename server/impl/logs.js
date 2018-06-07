const config = global.config
const server = global.server

const md_db = server.get("db")

const me = server.get("logs")
const data = me.data

me.start = async()=>
{
    let db_data = await md_db.load("logs")

    for(let i = 0,len = db_data.length;i < len;++i)
    {
        let db_one_data = db_data[i]

        data.items.push({
            id : db_one_data._id,
            content : db_one_data.content,
            update : db_one_data.update,
        })

        data.id_helper = Math.max(data.id_helper,db_one_data._id)
    }

    console.log(`has alread load ${data.items.length} log`)

    // console.dir(data.items)

    return true
}

me.add = (content)=>
{
    let log = {
        id : data.id_helper + 1,
        content : content,
        update : Date.now(),
    }

    data.id_helper++

    if(data.items.length > config.logs.max)
    {

        data.items.splice(0,data.items.length - config.logs.max + 50)   //多删除一点

        let last_id = data.items[data.items.length - 1].id

        md_db.remove_many("logs",{_id : {$lt : last_id}})
    }

    data.items.push(log)

    {
        let db = {
            content : log.content,
            update : log.update,
        } 

        md_db.upsert("logs",{_id : log.id},db)
    }

    console.log(content)
}

me.get_all = ()=>
{
    return data.items
}

