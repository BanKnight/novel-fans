const Nedb = require('nedb')
const path = require("path")
const fs = require("fs")

const config = global.config
const server = global.server

const me = server.get("db")

const data = me.data

me.start = async function ()
{
    try
    {
        fs.mkdirSync(path.resolve(config.db))
    }
    catch (err)
    {
    }
}

me.get_col = function (name)
{
    let col = data[name]
    if (col)
    {
        return col
    }

    col = new Nedb({ filename: path.resolve(config.db, `${name}.col`), autoload: true })

    col.persistence.compactDatafile()
    col.persistence.setAutocompactionInterval(1000 * 3600 * 4)      //8 hours

    data[name] = col

    return col
}

const empty = {}

me.load = function (name, cond)
{
    let col = me.get_col(name)

    cond = cond || empty

    return new Promise(function (resolve, reject)
    {
        col.find(cond, function (err, docs)
        {
            if (err)
            {
                reject(err)
            }
            else
            {
                resolve(docs)
            }
        })
    })

}

/**
 * db_data 不能带_id
 */
me.upsert = function (name, cond, db_data)
{
    const col = me.get_col(name)

    col.update(cond, { $set: db_data }, { upsert: true })

}

me.index = function (name, field)
{
    const col = me.get_col(name)

    col.ensureIndex({ fieldName: field, unique: true })
}

me.remove = function (name, cond)
{
    const col = me.get_col(name)

    col.remove(cond, {})
}

me.remove_many = async (name, cond) =>
{
    const col = me.get_col(name)

    col.remove(cond, { multi: true })

}