const session = require("koa-session-minimal")
const compose = require("koa-compose")

const server = global.server
const app = server.app
const routers = server.routers

const md_users = server.get("users")
const md_sessions = server.get("sessions")

let cookie = {
    maxAge: 3600 * 24 * 30, // cookie有效时长
  }

const session_router = session({
    store: md_sessions,
    cookie: cookie,
})

function try_init_session(ctx,next)
{
    if(ctx.session == null)
    {
        return
    }

    let session = ctx.session

    console.log("init_session")

    //正在读的书 [name] = {chapter:index}
    session.reading = session.reading || {

    }

    return next()
}

function find_user(ctx,next)
{
    let user_id = ctx.session.user_id
    if(user_id == null)
    {
        return next()
    }

    let user = md_users.get(user_id)

    ctx.user = user

    return next()
}

routers.use(session_router)
routers.use(try_init_session)
routers.use(find_user)
