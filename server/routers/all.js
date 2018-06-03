const server = global.server
const app = server.app
const routers = server.routers

const md_books = server.get("books")

routers.get("/",async(ctx,next)=>
{
    let info = {
        books : md_books.get_all()
    }
    ctx.render("books",info)
})

routers.get("/books",async(ctx,next)=>
{
    ctx.redirect("/")
})