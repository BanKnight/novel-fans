const helmet = require('koa-helmet')

const server = global.server
const app = server.app
const routers = server.routers

const md_books = server.get("books")
const md_logs = server.get("logs")
const md_tasks = server.get("tasks")

routers.use(helmet.noCache())           //浏览器不要缓存

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

    if(ctx.user)
    {
        info.books = md_books.get_all()
    }
    else
    {
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
                let chapter = book.chapters[read.chapter]

                info.books[book_name] = {
                    book : book,
                    chapter : chapter,
                    updated : (book.last > read.time)
                }
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
    let info = {
        logs : md_logs.get_all()
    }

    ctx.render("logs",info)
})

routers.get("/search",async(ctx,next)=>
{
    let info = {
        books :md_books.get_all()
    }

    ctx.render("search",info)
})

routers.post("/search",async(ctx,next)=>
{
    let params = ctx.request.body
    let book_name = params.keyword

    console.log("get a searching task : " + book_name)

    if(md_books.get(book_name))
    {
        ctx.body = {is_ok : true ,msg : "这本书已经存在"}
    }
    else
    {
        ctx.body = {is_ok : true ,msg : "这本书正在后台收录中"}

        setImmediate(async()=>
        {
            md_tasks.try_add_book(book_name)
        })
    }
})

if(process.env.NODE_ENV != "production")
{
    
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
}
routers.get("/me",async(ctx,next)=>
{
    ctx.render("me")
})


