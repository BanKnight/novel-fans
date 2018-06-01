const Koa = require("koa")
const Router = require("koa-router")

require("./kernel/utils")

const server = global.server = require("./kernel/athena")

// server.app = new Koa()

require("./server")

async function start()
{
    if(await server.start() == false)
    {
        console.log("start server error")
    }
}

console.log("start now")

start()

