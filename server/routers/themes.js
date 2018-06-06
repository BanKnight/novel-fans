const path = require("path")
const assert = require("assert")
const moment = require("moment")
const static = require("koa-static-cache")

const LRU = require('lru-cache')

const render = require("../../kernel/views")
const template = render.template

const configs = global.configs
const server = global.server
const app = server.app
const routers = server.routers

//添加 moment plugin
template.defaults.imports.moment = function(content,format_str)
{
    return moment(content).format(format_str)
}

template.defaults.imports.from_now = function(content)
{
    return moment(content).fromNow()
}

let views_path = path.resolve(config.content,"themes",config.theme || "default")

{
    let admin_path = path.resolve("admin")

    console.log(`views path is ${views_path}`)

    render(app, {
        pathes: [views_path],
        extname: '.art',
        debug: process.env.NODE_ENV !== 'production'
    })
}

{//theme static
    const files = new LRU({ max: 1000 })

    let theme = path.resolve(views_path,"public")
    
    app.use(static(theme,{prefix:"/public/",buffer:true,maxAge: 30 * 24 * 60 * 60,gzip:true,dynamic:true,files:files}))
}
if(process.env != "production")
{//admin static

    // const files = new LRU({ max: 1000 })

    const fs = require("fs")

    let labs_path = path.resolve(views_path,"labs")

    routers.get("/labs/:file",async(ctx,next)=>
    {
        let real_file = path.resolve(labs_path,ctx.params.file)
        if(fs.existsSync(real_file))
        {
            ctx.body = fs.readFileSync(real_file)
            ctx.set("Content-Type", "text/html; charset=utf-8")
        }
        else{
            console.log(`${real_file} is not exists`)
        }
    })
    
    // app.use(static(admin_static,{prefix:"/labs/",buffer:true,gzip:true,dynamic:true}))
}

