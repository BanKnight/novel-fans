const server = global.server
const app = server.app
const routers = server.routers

const md_books = server.get("books")
const md_logs = server.get("logs")

routers.get("/",async(ctx,next)=>
{
    let info = {
        books : md_books.get_all()
    }

    console.dir(info.books)

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

