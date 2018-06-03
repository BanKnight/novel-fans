const helmet = require('koa-helmet')
const limit = require('koa-limit')
const convert = require('koa-convert')
var bodyParser = require('koa-bodyparser')

const server = global.server
const app = server.app
const routers = server.routers

console.log("-----------------------routers")

routers.use(async (ctx,next)=>
{
    console.log(`Process ${ctx.req.method} ${ctx.req.url}`);
    // console.dir(ctx.request.headers)
        
    await next()
})

routers.use(async(ctx,next)=>
{
    ctx.state = server.data

    await next()
})

routers.use(convert(limit({
    limit: 1000,
    interval: 1000 * 60
  })))


routers.use(helmet.noCache())           //浏览器不要缓存
routers.use(helmet.noSniff())           
routers.use(helmet.frameguard())         
routers.use(helmet.xssFilter())         
routers.use(helmet.hidePoweredBy())     //      删除了 header 中的 X-Powered-By 标签
routers.use(helmet.ieNoOpen())

routers.use(bodyParser())

