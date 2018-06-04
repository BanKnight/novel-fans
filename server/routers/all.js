const server = global.server
const app = server.app
const routers = server.routers

const md_books = server.get("books")
const md_logs = server.get("logs")
const md_tasks = server.get("tasks")

routers.get("/",async(ctx,next)=>
{
    let info = {
        books : md_books.get_all()
    }

    // console.dir(info.books)

    ctx.render("books",info)
})

routers.get("/books",async(ctx,next)=>
{
    ctx.redirect("/")
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
        chapter = book.chapters[ctx.params.chapter_index]
    }

    let info = {
        book : book,
        chapter : chapter,
        index : parseInt(chapter.index),
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

            // md_logs.add(`${book_name} searching`)

            // let book = await md_tasks.search(book_name)
            // if(book == null)
            // {
            //     md_logs.add(`searching ${book_name} failed`)
            // }
            // else if(book !== false)     //等于false 表示后来者，第一个查询的返回的是book
            // {
            //     md_logs.add(`searching ${book_name} ok`)
            //     md_books.add(book)
            // }
        })
    }
})
