const server = require("../kernel/athena")

server.start = async function()
{
    let ret = await server.start_modules()

    if(ret == false)
    {
        return false
    }

    return true
}

