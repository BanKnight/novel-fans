const server = global.server
const app = server.app
const routers = server.routers

const md_books = server.get("books")
const md_logs = server.get("logs")
const md_tasks = server.get("tasks")

routers.get("/",async(ctx,next)=>
{

    if(ctx.user)
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
        info.books = {}
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

routers.get("/chapter/:book_name/:chapter_index",async(ctx,next)=>
{
    let book = md_books.get(ctx.params.book_name)
    let chapter = null

    if(book)
    {
        chapter = book.chapters[parseInt(ctx.params.chapter_index)]
    }

    let info = {
        book : book,
        chapter : chapter,
        index : chapter.index,
    }

    ctx.render("chapter",info)
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

routers.get("/me",async(ctx,next)=>
{
    ctx.render("me")
})
