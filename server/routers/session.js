const session = require("koa-session-minimal")
const server = global.server
const routers = server.routers

const md_users = server.get("users")
const md_sessions = server.get("sessions")

let cookie = {
    maxAge: 1000 * 3600 * 24 * 20, // cookie有效时长
}

const session_router = session({
    store: md_sessions,
    cookie: cookie,
})

async function find_user(ctx, next)
{
    while (ctx.user == null)
    {
        let user_id = ctx.session.user_id
        if (user_id == null)
        {
            let user = await md_users.new_temp_user()

            ctx.user = user
            ctx.session.user_id = user.id
        }
        else
        {
            let user = md_users.get(user_id)
            if (user == null)
            {
                delete ctx.session.user_id
            }
            else
            {
                ctx.user = user
            }
        }
    }

    return next()
}

routers.use(session_router)
routers.use(find_user)
