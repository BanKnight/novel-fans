const Koa = require("koa")
const Router = require("koa-router")

require("./config")
require("./kernel/utils")

const server = global.server = require("./kernel/athena")

require("./server")

async function start()
{
    if(await server.start() == false)
    {
        console.log("start server error")
    }
}

start()

