const mongo = require("mongodb")
const assert = require("assert")

const config = global.config
const server = global.server

const me = server.get("db")

const data = me.data

me.start = async function()
{
    const connect_str = `mongodb://${config.db.host}:${config.db.port}`

    try
    {
        const client = await mongo.connect(connect_str)

        data.db = client.db(config.db.db)

        console.log(`connect ${connect_str}:${config.db.db} ok`)
    }
    catch(err)
    {
        console.log(err)

        return false
    }
}

me.load = async(name,cond,fields)=>
{
    try
    {
        assert(data.db)

        cond = cond || {}
        fields = fields || {}

        const col = data.db.collection(name)
        const ret = await col.find(cond).toArray()

        /*
            const cursor = col.find({a:1}).limit(2);

            while(await cursor.hasNext()) {
            const doc = await cursor.next();
            console.dir(doc);
        */

        return ret
    }
    catch(err)
    {
        console.log(err)
    }
}

me.upsert = async(name,cond,db_data)=>
{
    try
    {
        const col = data.db.collection(name)

        const r = await col.updateOne(cond, {$set: db_data}, {upsert: true})
    
        //assert.equal(1, r.upsertedCount)
    }
    catch(err)
    {
        console.log(err);
    }
}

me.index = async(name,field)=>
{
    try
    {
        const col = data.db.collection(name)

        const r = await col.createIndex(field,{unique : true})
    }
    catch(err)
    {
        console.log(err)
    }
}

me.remove = async(name,cond)=>
{
    try
    {
        const col = data.db.collection(name)

        const r = await col.deleteOne(cond)    
    }
    catch(err)
    {
        console.log(err)
    }
}

me.remove_many = async(name,cond)=>
{
    try
    {
        const col = data.db.collection(name)

        const r = await col.deleteMany(cond)    
    }
    catch(err)
    {
        console.log(err)
    }
}