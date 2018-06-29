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

    server.data.subs = subs

    return true
}

me.search_site = async(site,book_name)=>
{
    let sub = subs[site]

    let book = await sub.search(book_name)

    return book
}

me.try_add_book = async(book_name)=>
{
    let is_lock = await md_locks.lock(book_name)

    if(is_lock !== true)        //已经有任务在搜索了 直接返回
    {
        return false
    }

    md_logs.add(`new searching task:${book_name}`)

    let the_best_book = await me.search_the_best(book_name)

    if(the_best_book == null)
    {
        md_locks.unlock(book_name,false)        //让那些等待锁的 都返回false

        md_logs.add(`no such book:${book_name}`)

        return null
    }

    //正文先不着急拉取
    md_books.add(the_best_book)         

    md_locks.unlock(book_name,false)        //让那些等待锁的 都返回false

    return the_best_book
}

me.search_the_best = async(book_name)=>
{
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
        let book = books[i]
        if(book == null)
        {
            continue
        }

        if(the_best_book == null)
        {
            the_best_book = book
            continue
        }

        if(book.chapters.length > the_best_book.chapters.length)
        {
            the_best_book = book
            continue
        }

        if(subs[book.site].priority > subs[the_best_book.site].priority)
        {
            the_best_book = book
            continue
        }
    }

    return the_best_book
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

    let web_site = subs[book.site]

    let url = book.url

    if(url == null || book.site != web_site.name)
    {
        url = await web_site.search_link(book.name)

        book.url = url
    }

    web_site.logs.add(`[${web_site.name}][${book.name}] get url:${url}`)

    let that_book = await web_site.search_basic(url)
    if(that_book == null)
    {
        md_locks.unlock(book.name,false)

        return false
    }

    await web_site.search_catalog(that_book)

    let search_index = book.chapters.length

    if(search_index == that_book.chapters.length)
    {
        web_site.logs.add(`[${web_site.name}][${book.name}] no need to update`)

        md_locks.unlock(book.name,false)

        return false
    }

    for(let i = search_index,len = that_book.chapters.length;i < len;++i)
    {
        let new_chapter = that_book.chapters[i]
        let old_chapter = book.chapters[i]

        if(old_chapter)
        {
            book.chapters[i] = new_chapter
        }
        else
        {
            book.chapters.push(new_chapter)
        }
    }

    //先不爬取正文
    // await web_site.search_chapters(book,search_index,book.chapters.length - 1)

    web_site.logs.add(`[${web_site.name}][${book.name}] check update done,${search_index} => ${book.chapters.length}`)

    md_logs.add(`update ${book.name} is done`)

    md_locks.unlock(book.name,false)

    return true
}

me.update_chapter = async(book,chapter)=>
{
    let lock_name = `/${book.name}/${chapter.index}`
    let is_lock = await md_locks.lock(lock_name)

    if(is_lock !== true)
    {
        return is_lock
    }

    let web_site = subs[book.site]

    if(chapter.url == null)
    {
        let book_url = book.url

        if(book_url == null)
        {
            book_url = await web_site.search_link(book.name)
            book.url = book_url
        }

        let that_book = await web_site.search_basic(book_url)
        if(that_book == null)
        {
            md_locks.unlock(lock_name,false)
            return false
        }

        await web_site.search_catalog(that_book)

        let that_chapter = that_book.chapters[chapter.index]
        if(that_chapter == null)
        {
            md_locks.unlock(lock_name,false)
            return false
        }
        if(chapter.name != that_chapter.name)
        {
            md_locks.unlock(lock_name,false)
            return false
        }

        chapter.url = that_chapter.url
    }

    await web_site.search_chapters(book,chapter.index,chapter.index)

    web_site.logs.add(`[${web_site.name}][${book.name}] update chapter done,${chapter.name}`)

    md_locks.unlock(lock_name,false)

    return true
}