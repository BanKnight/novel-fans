const helmet = require('koa-helmet')
const compress = require('koa-compress')
const crypto = require('crypto');
const assert = require("assert")
const uid = require("uid-safe")

const server = global.server
const routers = server.routers

const md_books = server.get("books")
const md_logs = server.get("logs")
const md_tasks = server.get("tasks")
const md_users = server.get("users")
const md_mail = server.get("mail")

const compresser = compress({
    filter: function (content_type)
    {
        return /text/i.test(content_type)
    },
    threshold: 100,
    flush: require('zlib').Z_SYNC_FLUSH
})

routers.use(helmet.noCache())           //浏览器不要缓存
routers.use(compresser)

routers.get("/", async (ctx, next) =>
{
    let user = ctx.user
    let has_read_something = false

    for (let _ in user.reading)
    {
        has_read_something = true
        break
    }

    if (has_read_something)
    {
        ctx.redirect("/books")
    }
    else
    {
        ctx.redirect("/search")
    }
})

routers.get("/books", async (ctx, next) =>
{
    let user = ctx.user
    let reading = user.reading

    let info = { books: {}, user: user }

    for (let book_name in reading)
    {
        let read = reading[book_name]
        let book = md_books.get(book_name)

        read.time = read.time || 0

        if (book)
        {
            let chapter = book.chapters[book.chapters.length - 1]

            info.books[book_name] = {
                book: book,
                chapter: chapter,
                index: read.chapter,
                updated: (book.last > read.time)
            }
        }
    }


    ctx.render("books", info)
})

routers.get("/catalog/:book_name", async (ctx, next) =>
{
    let info = {
        user: ctx.user,
        book: md_books.get(ctx.params.book_name)
    }

    ctx.render("catalog", info)
})

routers.del("/book", async (ctx, next) =>
{
    let user = ctx.user

    console.log(`delete my books ${ctx.request.body.name}`)

    delete user.reading[ctx.request.body.name]

    md_users.update_book(user)

    ctx.body = { is_ok: true }
})

routers.get("/chapter/:book_name/last_read", async (ctx, next) =>
{
    let book = md_books.get(ctx.params.book_name)

    if (book == null)
    {
        return
    }

    let user = ctx.user
    let chapter_index = 0

    let read_info = user.reading[book.name]
    if (read_info)
    {
        chapter_index = read_info.chapter
    }

    chapter_index = Math.max(chapter_index, 0)
    chapter_index = Math.min(chapter_index, book.chapters.length - 1)

    ctx.redirect(`/chapter/${book.name}/${chapter_index}`)
})

routers.get("/chapter/:book_name/:chapter_index", async (ctx, next) =>
{
    let book = md_books.get(ctx.params.book_name)

    if (book == null)
    {
        return
    }

    let index = parseInt(ctx.params.chapter_index)
    let chapter = book.chapters[index]

    if (chapter == null)
    {
        return
    }

    if (chapter.need_load_content)       //
    {
        await md_books.load_chapter(book, chapter)
    }

    if (chapter.content == null)     //也许从来没有拉取过数据,这时候需要重新拉取
    {
        let is_updated = await md_tasks.update_chapter(book, chapter)
        if (is_updated)
        {
            md_books.update_chapter(book, chapter)       //存入数据库
        }

        md_books.update_chapter(book, chapter)
    }

    let info = {
        book: book,
        chapter: chapter,
        index: chapter.index,
        user: ctx.user,
    }

    let user = ctx.user
    let read_info = user.reading[book.name]

    if (read_info == null)
    {
        read_info = {}
        user.reading[book.name] = read_info
    }

    read_info.chapter = index
    read_info.time = Date.now()

    md_books.update_last_read(book)

    md_users.update_book(user)

    ctx.render("chapter", info)
})

routers.get("/intro/:book_name", async (ctx, next) =>
{
    let book = md_books.get(ctx.params.book_name)
    if (book == null)
    {
        return
    }

    let info = {
        user: ctx.user,
        book: book,
        chapter: book.chapters[book.chapters.length - 1],
    }

    ctx.render("intro", info)
})

routers.get("/logs", async (ctx, next) =>
{
    ctx.render("logs", {
        user: ctx.user,
    })
})

routers.get("/logs/:last_id", async (ctx, next) =>
{
    let max_count = 0
    let last_id = parseInt(ctx.params.last_id)

    console.log(`fetch logs:${last_id}`)

    let logs = md_logs.get_all()
    let info = []

    let the_last_index = logs.length - 1
    let start_index = the_last_index
    if (last_id > 0)
    {
        start_index = the_last_index - (logs[the_last_index].id - last_id) - 1
    }

    for (let stop_index = start_index - 6; start_index >= stop_index && start_index >= 0; start_index--)
    {
        info.push(logs[start_index])
    }

    // console.dir(info)

    ctx.body = { logs: info }
})

routers.get("/search", async (ctx, next) =>
{
    let info = {
        books: md_books.get_all(),
        user: ctx.user,
    }

    ctx.render("search", info)
})

routers.get("/search/:keyword", async (ctx, next) =>
{
    let book_name = ctx.params.keyword

    console.log("get a searching task : " + book_name)

    if (md_books.get(book_name))
    {
        ctx.body = { redirect: `/intro/${book_name}` }

        return
    }

    let book = true

    setImmediate(async () =>
    {
        //false : another searching
        //null:no such book
        book = await md_tasks.try_add_book(book_name)
    })

    // console.log(`time 1:${Date.now()}`)

    for (let i = 0; i < 300; ++i)
    {
        await server.sleep(10)
        if (book !== true)
        {
            // console.log(`break because of time,${i}`)
            break
        }
    }

    // console.log(`time 2:${Date.now()},${typeof(book)},${book}`)

    if (book == null)
    {
        // console.log("no such book 2")
        ctx.body = { is_ok: true, msg: "查无此书" }
        return
    }

    if (book === true)
    {
        ctx.body = { is_ok: true, msg: "服务器繁忙，稍后再搜索" }
        return
    }

    ctx.body = { redirect: `/intro/${book_name}` }
})



const cmds = {}

// get 
//example:get modules.basic.data.xx
cmds.get = function (arg)
{
    return eval(`(${arg})`)
}

cmds.set = function ()
{

}

routers.post("/debug", async (ctx, next) =>
{
    let params = ctx.request.body
    let cmd = params.cmd
    let arg = params.arg
    let secret = params.secret

    if (secret != server.secret)
    {
        return
    }

    console.dir(params)

    try
    {
        let cmd_func = cmds[cmd]
        if (cmd_func == null)
        {
            ctx.body = { result: false, reason: "no such cmd" }
            return
        }

        let result = cmd_func(arg)
        if (result)
        {
            console.dir(result)
            ctx.body = { result: true, data: result }
            return
        }

        ctx.body = { result: true, data: "no result" }
    }
    catch (err)
    {
        console.log(err)
        ctx.body = { result: false, reason: err }
    }
})

routers.get("/refetch/:book_name/:chapter_index", async (ctx, next) =>
{
    let book_name = ctx.params.book_name
    let chapter_index = parseInt(ctx.params.chapter_index)

    let book = md_books.get(book_name)
    if (book == null)
    {
        ctx.body = { is_ok: false, msg: "查无此书" }
        return
    }

    let chapter = book.chapters[chapter_index]

    if (chapter == null)
    {
        ctx.body = { is_ok: false, msg: "查无此章节" }
        return
    }

    let is_updated = await md_tasks.update_chapter(book, chapter)
    if (is_updated == false)
    {
        ctx.body = { is_ok: false, msg: "更新失败" }
        return
    }

    chapter.need_load_content = false

    md_books.update_chapter(book, chapter)

    ctx.body = { is_ok: true, msg: chapter.content }
})

routers.get("/me", async (ctx, next) =>
{
    let user = ctx.user
    if (user.is_temp === true)
    {
        ctx.redirect("/login")
        return
    }

    ctx.render("me", {
        user: ctx.user,
    })
})

routers.get("/about", async (ctx, next) =>
{
    ctx.render("about", {
        user: ctx.user,
    })
})

routers.get("/login", async (ctx, next) =>
{
    let user = ctx.user
    if (user.is_temp !== true)
    {
        ctx.redirect("/")
        return
    }

    ctx.render("login", {
        user: ctx.user,
    })
})

routers.post("/login", async (ctx, next) =>
{
    if (ctx.user.is_temp !== true)
    {
        ctx.redirect("/books")
        return
    }

    //非正式玩家
    let mail = ctx.request.body.mail.toLowerCase()
    let pass = ctx.request.body.password

    assert(mail.length > 0)
    assert(pass.length > 0)

    const md5 = crypto.createHash('md5')
    const trans_pass = md5.update(pass).digest('hex');

    let user = md_users.get_by_mail(mail)
    if (user == null)   //注册
    {
        user = ctx.user

        user.mail = mail
        user.pass = trans_pass

        md_users.temp_to_regular(user)

        ctx.body = { is_ok: true, redirect: "/" }

        return
    }

    if (user.pass != trans_pass)
    {
        ctx.body = { is_ok: false, msg: "密码错误" }
        return
    }

    //合并一次书架
    for (let book_name in ctx.user.reading)
    {
        let read_info = ctx.user.reading[book_name]
        let exist = user.reading[book_name]

        if (exist == null)
        {
            exist = { chapter: read_info.chapter, time: read_info.time }
            user.reading[book_name] = exist
        }
        else
        {
            exist.chapter = Math.max(exist.chapter, read_info.chapter)
            exist.time = Math.max(exist.time, read_info.time)
        }
    }

    ctx.session.user_id = user.id

    md_users.update_book(user)

    ctx.body = { is_ok: true, redirect: "/" }
})

routers.get("/forget/:mail", async (ctx) =>
{
    let mail = ctx.params.mail.toLowerCase()

    let user = md_users.get_by_mail(mail)

    if (user == null)
    {
        ctx.body = { is_ok: false, msg: "查无此用户" }
        return
    }

    // check ctx.request.domain


    user.token = uid.sync(24)

    md_users.update(user)       //保存token

    ctx.body = { is_ok: true, msg: "已经发到你的邮件" }

    let url = `${ctx.request.origin}/change/${mail}/${user.token}`

    md_mail.send_html(mail, "修改密码", `<a href="${url}">点击跳转修改密码</a>`)

    //Todo send mail
})

routers.get("/change/:mail/:token", async (ctx) =>
{
    let mail = ctx.params.mail.toLowerCase()
    let token = ctx.params.token.toLowerCase()

    //check mail and token
    let user = md_users.get_by_mail(mail)
    if (user == null)
    {
        ctx.status = 404
        return
    }

    if (user.token.toLowerCase() != token)    //超时
    {
        ctx.redirect("/")
        return
    }

    ctx.session.forgeting = {
        mail: mail,
        token: token
    }

    ctx.render("change_password")
})

routers.post("/change", async (ctx) =>
{
    if (!ctx.session.forgeting)
    {
        return
    }

    let mail = ctx.session.forgeting.mail
    let pass = ctx.request.body.password

    assert(pass.length > 0)

    const md5 = crypto.createHash('md5')
    const trans_pass = md5.update(pass).digest('hex');

    let user = md_users.get_by_mail(mail)

    user.pass = trans_pass

    //合并一次书架
    for (let book_name in ctx.user.reading)
    {
        let read_info = ctx.user.reading[book_name]
        let exist = user.reading[book_name]

        if (exist == null)
        {
            exist = { chapter: read_info.chapter, time: read_info.time }
            user.reading[book_name] = exist
        }
        else
        {
            exist.chapter = Math.max(exist.chapter, read_info.chapter)
            exist.time = Math.max(exist.time, read_info.time)
        }
    }

    ctx.session.user_id = user.id

    delete ctx.session.forgeting

    delete user.token

    md_users.update_book(user)
    md_users.update(user)

    ctx.body = { is_ok: true, redirect: "/" }
})



