const server = global.server
const config = global.config

const app = server.app

server.start = async function()
{
    let ret = await server.start_modules()

    if(ret == false)
    {
        return false
    }

    server.start_routers()

    app.listen(config.port)

    console.log(`listening at ${config.port}`)

    return true
}

