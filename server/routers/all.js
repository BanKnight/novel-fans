const helmet = require('koa-helmet')
const compress = require('koa-compress')
const crypto = require('crypto');
const assert = require("assert")

const server = global.server
const app = server.app
const routers = server.routers

const md_books = server.get("books")
const md_logs = server.get("logs")
const md_tasks = server.get("tasks")
const md_users = server.get("users")

const compresser = compress({
    filter: function (content_type) {
        return /text/i.test(content_type)
    },
    threshold: 100,
    flush: require('zlib').Z_SYNC_FLUSH
})

routers.use(helmet.noCache())           //浏览器不要缓存
routers.use(compresser)

routers.get("/",async(ctx,next)=>
{
    let session = ctx.session
    let has_read_something = false

    for(let key in session.reading)
    {
        has_read_something = true
        break
    }

    if(has_read_something)
    {
        ctx.redirect("/books")
    }
    else
    {
        ctx.redirect("/search")
    }
})

routers.get("/books",async(ctx,next)=>
{
    let info = {}
    let session = ctx.session
    let reading = session.reading

    info.books = {}

    for(let book_name in reading)
    {
        let read = reading[book_name]
        let book = md_books.get(book_name)

        read.time = read.time || 0

        if(book)
        {
            let chapter = book.chapters[book.chapters.length - 1]

            info.books[book_name] = {
                book : book,
                chapter : chapter,
                index : read.chapter,
                updated : (book.last > read.time)
            }
        }
    }
    

    ctx.render("books",info)
})

routers.get("/catalog/:book_name",async(ctx,next)=>
{
    let info = {
        book : md_books.get(ctx.params.book_name)
    }

    console.log(`get a catalog:${ctx.params.book_name}`)

    if(info.book)
    {
        console.log("successfull get a book")
    }

    ctx.render("catalog",info)
})

routers.del("/book",async(ctx,next)=>
{
    let session = ctx.session

    console.log(`delete my books ${ctx.request.body.name}`)

    delete session.reading[ctx.request.body.name]

    ctx.body = {is_ok:true}
})

routers.get("/chapter/:book_name/last_read",async(ctx,next)=>
{
    let book = md_books.get(ctx.params.book_name)

    if(book == null)
    {
        return
    }

    let session = ctx.session
    let chapter_index = 0

    let read_info = session.reading[book.name]
    if(read_info)
    {
        chapter_index = read_info.chapter
    }

    chapter_index = Math.max(chapter_index,0)
    chapter_index = Math.min(chapter_index,book.chapters.length - 1)

    ctx.redirect(`/chapter/${book.name}/${chapter_index}`)
})

routers.get("/chapter/:book_name/:chapter_index",async(ctx,next)=>
{
    let book = md_books.get(ctx.params.book_name)

    if(book == null)
    {
        return
    }

    let index = parseInt(ctx.params.chapter_index)
    let chapter = book.chapters[index]

    if(chapter == null)
    {
        return
    }

    console.log("read chapter")

    let info = {
        book : book,
        chapter : chapter,
        index : chapter.index,
    }

    let session = ctx.session
    let read_info = session.reading[book.name]

    if(read_info == null)
    {
        read_info = {}
        session.reading[book.name] = read_info
    }

    read_info.chapter = index
    read_info.time = Date.now()

    md_books.update_last_read(book)

    if(ctx.user)
    {
        md_users.update(ctx.user)
    }

    ctx.render("chapter",info)
})

routers.get("/intro/:book_name",async(ctx,next)=>
{
    let book = md_books.get(ctx.params.book_name)
    if(book == null)
    {
        return
    }

    let info = {
        book : book,
        chapter : book.chapters[book.chapters.length - 1],
    }

    ctx.render("intro",info)
})

routers.get("/logs",async(ctx,next)=>
{
    ctx.render("logs")
})

routers.get("/logs/:last_id",async(ctx,next)=>
{
    let max_count = 0
    let last_id = parseInt(ctx.params.last_id)

    console.log(`fetch logs:${last_id}`)

    let logs = md_logs.get_all()
    let info = []

    let the_last_index = logs.length - 1
    let start_index = the_last_index
    if(last_id > 0)
    {
        start_index = the_last_index - (logs[the_last_index].id - last_id) - 1
    }

    for(let stop_index = start_index - 6;start_index >= stop_index && start_index >= 0;start_index--)
    {
        info.push(logs[start_index])
    }

    // console.dir(info)

    ctx.body = {logs : info}
})

routers.get("/search",async(ctx,next)=>
{
    let info = {
        books :md_books.get_all()
    }

    ctx.render("search",info)
})

routers.get("/search/:keyword",async(ctx,next)=>
{
    let book_name = ctx.params.keyword

    console.log("get a searching task : " + book_name)

    if(md_books.get(book_name))
    {
        ctx.body = {redirect : `/intro/${book_name}`}

        return
    }

    let book = null

    setImmediate(async()=>
    {
        book = await md_tasks.try_add_book(book_name)
    })

    // console.log(`time 1:${Date.now()}`)

    for(let i = 0;i < 300;++i)
    {
        await server.sleep(10)
        if(book != null)
        {
            // console.log(`break because of time,${i}`)
            break
        }
    }

    // console.log(`time 2:${Date.now()},${typeof(book)},${book}`)

    if(!book)
    {
        // console.log("no such book 2")
        ctx.body = {is_ok : true ,msg : "查无此书"}    
        return
    }

    ctx.body = {redirect : `/intro/${book_name}`}
})


    
const cmds = {}

// get 
//example:get modules.basic.data.xx
cmds.get = function(arg)
{
    return eval(`(${arg})`)
}

cmds.set = function()
{

}

routers.post("/debug",async(ctx,next)=>
{
    let params = ctx.request.body
    let cmd = params.cmd
    let arg = params.arg
    let secret = params.secret

    if(secret != 10086)
    {
        return
    }

    console.dir(params)

    try
    {
        let cmd_func = cmds[cmd]
        if(cmd_func == null)
        {
            ctx.body = {result:false,reason:"no such cmd"}
            return
        }
    
        let result = cmd_func(arg)
        if(result)
        {
            console.dir(result)
            ctx.body = {result:true,data : result}
            return 
        }
    
        ctx.body = {result:true,data:"no result"}
    }
    catch(err)
    {
        console.log(err)
        ctx.body = {result:false,reason:err}
    }
})

routers.get("/refetch/:book_name/:chapter_index",async(ctx,next)=>
{
    let book_name = ctx.params.book_name
    let chapter_index = parseInt(ctx.params.chapter_index)

    let book = md_books.get(book_name)
    if(book == null)
    {
        ctx.body = {is_ok : false,msg : "查无此书"}
        return
    }

    let chapter = book.chapters[chapter_index]

    if(chapter == null)
    {
        ctx.body = {is_ok : false,msg : "查无此章节"}
        return 
    }

    let is_updated = await md_tasks.update_chapter(book,chapter_index)
    if(is_updated == false)
    {
        ctx.body = {is_ok : false,msg : "更新失败"}
        return
    }
    
    md_books.update_chapter(book,chapter_index)

    ctx.body = {is_ok : true,msg : chapter.content}
})

routers.get("/me",async(ctx,next)=>
{
    if(ctx.user == null)
    {
        ctx.redirect("/login")
        return
    }

    ctx.render("me")
})

routers.get("/about",async(ctx,next)=>
{
    ctx.render("about")
})

routers.get("/login",async(ctx,next)=>
{
    if(ctx.user)
    {
        ctx.redirect("/")
        return
    }

    ctx.render("login")
})

routers.post("/login",async(ctx,next)=>
{
    if(ctx.user)
    {
        ctx.redirect("/books")
        return
    }

    let mail = ctx.request.body.mail.toLowerCase()
    let pass = ctx.request.body.password

    assert(mail.length > 0)
    assert(pass.length > 0)

    const md5 = crypto.createHash('md5')
    let trans_pass = md5.update(pass).digest('hex');

    let user = md_users.get_by_mail(mail)
    if(user == null)
    {
        user = await md_users.new(mail,trans_pass)
    }
    else
    {
        if(user.pass != trans_pass)
        {
            ctx.body = {is_ok : false,msg : "密码错误"}
            return
        }
    }

    ctx.session.user_id = user.id

    //合并一次书架
    let should_save = false
    for(let book_name in ctx.session.reading)
    {
        let read_info = ctx.session.reading[book_name]
        let exist = user.reading[book_name]

        should_save = true

        if(exist == null)
        {
            exist = {chapter : read_info.chapter,time : read_info.time}
            user.reading[book_name] = exist
        }
        else
        {
            exist.chapter = Math.max(exist.chapter,read_indo.chapter)
            exist.time = Math.max(exist.time,read_indo.time)
        }
    }

    if(should_save)
    {
        console.log("合并书架")
        console.dir(user)
        md_users.update(user)
    }

    ctx.body = {is_ok : true,redirect : "/"}
})



