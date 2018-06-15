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

    server.init_data()

    server.secret = rand(1000,10000)

    app.listen(config.port)

    console.log(`listening at ${config.port},secret is ${server.secret}`)

    return true
}

server.init_data = async function()
{
    server.data.web_name = config.web_name
    server.data.web_description = config.web_description || "为朋友而生的小说网站"
}

