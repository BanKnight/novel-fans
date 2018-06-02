const fs = require("fs")
const path = require("path")

const config = global.config
const server = global.server

const md_db = server.get("db")
const md_books = server.get("books")
const md_crawler = server.get("crawler")
const md_locks = server.get("locks")
const md_logs = server.get("logs")


const me = server.get("tasks")
const subs = me.subs
const data = me.data

me.start = async()=>
{
    server.run_every(2 * 60 * 1000,me.update)

    const blacks = ['index']

    const file_or_folders = fs.readdirSync(__dirname)

    let env = {
        server : server,
        father : this,
        crawler : md_crawler,
        cheerio : require("cheerio"),
    }

    for(let i = 0, len = file_or_folders;i < len;++i)
    {
        let element = file_or_folders[i]

        let base_name = path.basename(element,".js")
        if(blacks.includes(base_name) == false)
        {
            let sub = require(path.join(__dirname,base_name))

            sub.name = base_name

            subs[base_name] = sub

            sub.init(env)
        }
    }
    return true
}

/*
    检查书籍更新
*/
me.update = ()=>
{

}

me.search = async(book_name)=>
{
    let is_lock = await md_locks.lock(book_name)

    if(is_lock !== true)
    {
        return is_lock
    }

    let tasks = []

    //多个网站同时发起搜索
    for(let name in subs)           
    {
        let sub = subs[name]

        let one_task = sub.search(book_name)

        tasks.push(one_task)
    }

    let books = await Promise.all(tasks)

    let the_best_book

    //找出章节数最多的
    for(let i = 0,len = books.length;i < len;++i)
    {
        let book = books[book]

        if(the_best_book)
        {
            if(book.chapters.count > the_best_book.chapters.count)
            {
                the_best_book = book
            }
        }
        else{
            the_best_book = book
        }
    }

    md_locks.unlock(book_name,the_best_book)

    return the_best_book
}