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

    console.log("start tasks!!!")

    // server.run_every(2 * 60 * 1000,me.update)

    const blacks = ['index']

    const file_or_folders = fs.readdirSync(__dirname)

    let env = {
        server : server,
        father : this,
        crawler : md_crawler,
        cheerio : require("cheerio"),
        logs : md_logs,
    }

    for(let i = 0, len = file_or_folders.length;i < len;++i)
    {
        let element = file_or_folders[i]

        let base_name = path.basename(element,".js")
        if(blacks.includes(base_name) == false)
        {
            let sub = require(path.join(__dirname,base_name))

            console.log("require sub:" + base_name)

            sub.name = base_name

            subs[base_name] = sub

            sub.init(env)
        }
    }
    return true
}

me.search = async(book_name)=>
{
    let is_lock = await md_locks.lock(book_name)

    if(is_lock !== true)
    {
        md_logs.add(`${book_name} is already added to the searching task`)
        return is_lock
    }

    md_logs.add(`new searching task:${book_name}`)

    let tasks = []

    //多个网站同时发起搜索
    for(let name in subs)           
    {
        let sub = subs[name]

        let one_task = sub.search(book_name)

        tasks.push(one_task)
    }

    let books = await Promise.all(tasks)

    md_logs.add(`${book_name} all searching task done`)

    let the_best_book

    //找出章节数最多的
    for(let i = 0,len = books.length;i < len;++i)
    {
        let book = books[i]
        if(book == null)
        {
            continue
        }
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

    md_locks.unlock(book_name,false)        //让那些等待锁的 都返回false

    return the_best_book
}

me.search_site = async(site,book_name)=>
{
    let sub = subs[site]

    let book = await sub.search(book_name)

    return book
}

me.update = async(book)=>
{
    let is_lock = await md_locks.lock(book.name)

    if(is_lock !== true)
    {
        md_logs.add(`${book.name} is already added to the updating task`)
        return is_lock
    }

    md_logs.add(`${book.name} is updating`)

    let sub = subs[book.site]

    let is_updated = await sub.update(book)

    md_logs.add(`update ${book.name} is done`)

    md_locks.unlock(book.name,false)

    return is_updated
}