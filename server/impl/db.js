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

    return new Promise(function (resolve, reject)
    {
        col.update(cond, { $set: db_data }, { upsert: true }, function (err)
        {
            if (err)
            {
                reject(err)
            }
            else
            {
                resolve()
            }
        })
    })

}

me.index = function (name, field)
{
    const col = me.get_col(name)

    return new Promise(function (resolve, reject)
    {
        col.ensureIndex({ fieldName: field, unique: true }, function (err)
        {
            if (err)
            {
                reject(err)
            }
            else
            {
                resolve()
            }
        });
    })
}

me.remove = function (name, cond)
{
    const col = me.get_col(name)

    return new Promise(function (resolve, reject)
    {
        col.remove(cond, {}, function (err, numRemoved) 
        {
            if (err)
            {
                reject(err)
            }
            else
            {
                resolve()
            }
        });
    })
}

me.remove_many = async (name, cond) =>
{
    const col = me.get_col(name)

    return new Promise(function (resolve, reject)
    {
        col.remove(cond, { multi: true }, function (err, numRemoved) 
        {
            if (err)
            {
                reject(err)
            }
            else
            {
                resolve()
            }
        })
    })
}