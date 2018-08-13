const Module = module.constructor
const cache = Module._cache

const chokidar = require("chokidar")
const path = require("path")

const prefix = process.cwd()
const blacks = ["head", "node_modules"]

const me = server.get("debug")
const data = me.data

me.start = async function ()
{
    const timers = data.timers

    const on_changed = function (path)
    {
        let exists = timers[path]
        if (exists)
        {
            return
        }
        timers[path] = setTimeout(() =>
        {
            delete timers[path]
            me.fix_one(path)
        }, 800)
    }

    const watcher = chokidar.watch([path.resolve("./server", "impl")], { ignored: /(^|[\/\\])\../, ignorePermissionErrors: true })

    watcher.on('ready', () =>
    {
        watcher.on('change', on_changed);
        watcher.on('add', on_changed);
    })
}
me._in_blacks = function (filename)
{
    for (let black of blacks)
    {
        if (filename.indexOf(black, prefix.length) > 0)
        {
            return true
        }
    }
    return false
}

me.fix_one = function (filename)
{
    let old_mod = cache[filename]
    if (old_mod == null)
    {
        return
    }

    if (old_mod.id == ".")
    {
        return
    }

    if (me._in_blacks(filename) === true)
    {
        return
    }

    let old_exports = old_mod.exports

    delete cache[filename]

    try
    {
        let new_exports = require(filename)

        let new_mod = cache[filename]

        new_mod.exports = old_exports

        for (let key in new_exports)
        {
            old_exports[key] = new_exports[key]
        }

        //nodejs 中完全没有必要的父子模块维护 导致要做清理比较麻烦
        //释放老模块的资源
        if (old_mod.parent)
        {
            old_mod.parent.children.splice(old_mod.parent.children.indexOf(old_mod), 1);
        }

        console.debug(`file fix ok:${filename}`)
    }
    catch (e)
    {
        console.error("fix err:" + e)
        cache[filename] = old_mod
    }
}