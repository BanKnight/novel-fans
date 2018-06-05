
let utils = {}
let storage = {}

utils.load = function(key)
{
    console.log("calling store function get:" + key)
}

utils.init = function()
{
    if(window.localStorage)
    {
        for(var i=0;i<window.localStorage.length;i++)
        {
            var key = window.localStorage.key(i)
            var val = window.localStorage.getItem(key)

            val = JSON.parse(val)

            storage[key] = val
        }
    }
}

utils.set_storage = function(path,val)
{
    let paths = path.split(".")

    let first = paths[0]
    let last = paths[paths.length - 1]

    paths = paths.slice(0,paths.length - 1)

    let target = storage

    for(let i = 0,len = paths.length;i < len;++i)
    {
        let key = paths[i]
        let parent = target

        target = parent[key]

        if(target == null)
        {
            target = {}
            parent[key] = target
        }
    }

    target[last] = val

    if(window.localStorage)
    {
        window.localStorage.setItem(first,JSON.stringify(storage[first]))
    }
}

utils.get_storage = function(path,def)
{
    let paths = path.split(".")
    let last = paths[paths.length - 1]

    paths = paths.slice(0,paths.length - 1)

    let target = storage

    for(let i = 0,len = paths.length;i < len;++i)
    {
        let key = paths[i]
        let parent = target

        target = parent[key]

        if(target == null)
        {
            target = {}
            parent[key] = target
        }
    }

    return target[last]
}