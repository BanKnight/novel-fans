const fs = require("fs")
const request = require("request")
const assert = require("assert")

const me = server.get("loader")
const data = me.data

const queues = data.queues

me.start = async()=>
{
    data.headers = {
        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
        'Content-Language': 'zh-CN',
        'Content-Type': 'text/html; charset=utf-8',
    }

    // setInterval(me.update,rand(80,150))

    setTimeout(me.update,rand(80,160))

    return true
}

me.update = function()
{
    setTimeout(me.update,rand(80,160))

    for(let source in queues)
    {
        let queue = queues[source]

        me.update_one_queue(source,queue)
    }
}

me.rand_update = function()
{
    setTimeout(me.rand_update,rand(100,200))


}

me.update_one_queue = function(source,queue)
{
    let doing_count = 0

    for(let i = 0,len = queue.length;i < 10 && doing_count < len;++i)
    {
        let task = queue[i]

        doing_count++

        me.do_task(source,task)
    }


    queue.splice(0,doing_count)

    // console.log(`has finish : ${doing_count},${queue.length}`)

}

me.do_task = (source,task)=>
{
    // console.dir(task)

    if(task.method == "get")
    {
        me.do_get_task(source,task)
    }
    else if(task.method == "post")
    {
        me.do_post_task(source,task)
    }
}

me.do_get_task = (source,task)=>
{
    let options = {
        url : task.url,
        qs: task.data,
        headers : data.headers,
    }

    request.get(options,function(error, response, body)
    {
        let is_ok = true
        if(error || response.statusCode != 200)
        {
            console.log(error)

            queues[source].push(task)
            return
        }

        task.cb(is_ok,body)
    })
}

me.do_post_task = (source,task)=>
{
    let options = {
        url : task.url,
        form: task.data,
        headers : data.headers,
    }

    request.post(options,function(error, response, body)
    {
        let is_ok = true
        if(error || response.statusCode != 200)
        {
            console.log(error)

            queues[source].push(task)
            return
            // is_ok = false
        }

        task.cb(is_ok,body)
    })
}
/*
    info.url
    info.data
    info.cb
*/
me.post_async = (source,info)=>
{
    let queue = queues[source]
    if(queue == null)
    {
        queue = []
        queues[source] = queue
    }

    queue.push({
        method : "post",
        url : info.url,
        data : info.data,
        cb : info.cb,
    })

    console.log(`add a new post task ${queue.length}`)
}

me.get_async = (source,info,cb)=>
{
    let queue = queues[source]
    if(queue == null)
    {
        queue = []
        queues[source] = queue
    }

    queue.push({
        method : "get",
        url : info.url,
        data : info.data,
        cb : info.cb,
    })

    console.log(`add a new post task ${queue.length}`)
}

me.post = async(source,url,data)=>
{
    return new Promise((resolve,reject)=>
    {
        let info = {
            url : url,
            data : data,
            cb : (is_ok,ret)=>
            {
                if(is_ok == false)
                {
                    reject("error")
                }
                else{
                    resolve(ret)
                }
            },
        }

        me.post_async(source,info)
    })
}

me.get = async(source,url,data)=>
{
    return new Promise((resolve,reject)=>
    {
        let info = {
            url : url,
            data : data,
            cb : (is_ok,ret)=>
            {
                if(is_ok == false)
                {
                    reject("error")
                }
                else{
                    resolve(ret)
                }
            },
        }
        me.get_async(source,info)
    })
}
