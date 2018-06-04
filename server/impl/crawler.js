const fs = require("fs")
const request = require("request")
const assert = require("assert")

const me = server.get("crawler")
const data = me.data

const queues = data.queues

me.start = async()=>
{
    data.headers = {
        'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        'Content-Type': 'text/html; charset=utf-8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Upgrade-Insecure-Requests': 1,
    }

    server.run_revery(80,160,me.update)

    return true
}

me.update = function()
{


    for(let source in queues)
    {
        let queue = queues[source]

        me.update_one_queue(source,queue)
    }
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
        timeout: 1000,
        gzip : true,
        encoding : null,
        headers : data.headers,
    }

    // console.log(`requesting get task ${task.url}`)
    // console.dir(options.qs)

    request.get(options,function(error, response, body)
    {
        task.try++
        if(error || response.statusCode != 200)
        {
            console.log(error)

            if(task.try < 30)
            {
                queues[source].push(task)
            }
            else
            {
                task.cb(false)
            }
            return
        }

        task.cb(true,body)
    })
}

me.do_post_task = (source,task)=>
{
    let options = {
        url : task.url,
        form: task.data,
        gzip:true,
        timeout: 3000,
        headers : data.headers,
    }

    // console.log(`requesting post task ${task.url}`)

    request.post(options,function(error, response, body)
    {
        // console.log(`post cb ${task.url}`)

        task.try ++

        if(error || response.statusCode != 200)
        {
            if(error)
            {
                console.log(error)
            }
            else
            {
                console.log("status is not 200")
            }

            if(task.try < 30)
            {
                queues[source].push(task)
            }
            else
            {
                task.cb(false)
            }
            return
        }

        task.cb(true,body)
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
        try : 0,
    })

    // console.log(`add a new post task ${info.url}`)
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
        try : 0,
    })

    // console.log(`add a new get task ${info.url}`)
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
