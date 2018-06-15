const assert = require("assert")

const config = global.config
const server = global.server

const md_db = server.get("db")
const md_tasks = server.get("tasks")
const md_logs = server.get("logs")

const me = server.get("books")
const data = me.data

me.start = async () => {
    let db_data = await md_db.load("basic")

    for (let i = 0, len = db_data.length; i < len; ++i) 
    {
        let db_one_data = db_data[i]
        let book = {
            name: db_one_data._id,
            author: db_one_data.author,
            summary: db_one_data.summary,
            site: db_one_data.site,
            url: db_one_data.url,
            create: db_one_data.create || Date.now(),
            last: db_one_data.last || Date.now(),
            last_read : db_one_data.last || 0,
            chapters: [],
        }

        data[book.name] = book

        // console.dir(book)
    }

    console.log(`has ready load ${db_data.length} books`)

    await md_db.index("chapter", { book: 1, index: 1 })   //设置索引

    db_data = await md_db.load("chapter",{},{content : 0})     //内容字段先不加载

    for (let i = 0, len = db_data.length; i < len; ++i) 
    {
        let db_one_data = db_data[i]
        let book = data[db_one_data.book]
        if (book == null) 
        {
            console.log("no such book in basic:" + db_one_data.book)
            continue
        }

        let chapter = {
            book: db_one_data.book,
            index: db_one_data.index,      //从1开始
            name: db_one_data.name,
        }

        chapter.need_load_content = true        //

        book.chapters.push(chapter)
    }

    for (let book_name in data) {
        let book = data[book_name]

        book.chapters.sort(me.chapter_cmp)
    }

    console.log(`has ready load ${db_data.length} chapters`)

    server.run_revery(20 * 60 * 1000, 30 * 60 * 1000, me.check_update)

    return true
}

me.chapter_cmp = (first, second) => {
    return first.index - second.index
}

me.check_update = async () => 
{
    md_logs.add("checking books")

    for (let name in data) 
    {
        let book = data[name]

        setImmediate(async () => 
        {
            let is_updated = await md_tasks.update(book)

            if (is_updated == true) 
            {
                me.update(book)
            }
        })
    }
}

me.add = (book) => {
    assert(data[book.name] == null)

    data[book.name] = book

    book.create = book.create || Date.now()

    {   // basic
        const db = {
            author: book.author,
            summary: book.summary,
            site: book.site,
            url: book.url,
            create: book.create,
            last: book.last || Date.now(),
        }

        md_db.upsert("basic", { _id: book.name }, db)
    }

    for (let index = 0; index < book.chapters.length; ++index) 
    {   //chapter
        let chapter = book.chapters[index]

        const db = {
            name: chapter.name,
            site: chapter.site,
            content : chapter.content,
            url : chapter.url,
        }

        chapter.need_save = null

        md_db.upsert("chapter", { book: book.name, index: index }, db)
    }

}

// 用于一本小说有更新后，写入更新的部分到db
me.update = (book) => 
{
    md_logs.add(`${book.name} begin to update to db`)

    let update_count = 0

    for (let last = book.chapters.length - 1, first = 0; last >= first; --last) 
    {
        let chapter = book.chapters[last]
        if (chapter == null) {
            continue
        }

        if (chapter.need_save == true) 
        {
            update_count++

            const db = {
                name: chapter.name,
                site: chapter.site,
                content: chapter.content,
                url: chapter.url,
            }

            chapter.need_save = null

            md_db.upsert("chapter", { book: book.name, index: chapter.index }, db)
        }
        else {
            break
        }
    }

    book.last = Date.now()      //上次更新的时间

    md_db.upsert("basic", { _id: book.name }, { last: book.last,url : book.url})

    md_logs.add(`${book.name} update:${update_count} chapters`)
}

me.update_last_read = (book)=>
{
    book.last_read = Date.now()

    md_db.upsert("basic", { _id: book.name }, { last_read: book.last_read,url : book.url})
}

me.load_chapter = async(book,chapter)=>
{
    let db_data = await md_db.load("chapter", { book: book.name, index: chapter.index },{content : 1})

    if(db_data.length == 0)
    {
        return
    }

    chapter.content = db_data[0].content
    chapter.need_load_content = false

    md_logs.add(`${book.name} load chapter:${chapter.name}`)

    if(chapter.timer)
    {
        return
    }

    //两天后卸掉正文，保持内存比较少
    chapter.timer = server.run_after(2 * 24 * 3600 * 1000,()=>
    {
        chapter.timer = null
        chapter.content = null
        chapter.need_load_content = true
    })
}

me.update_chapter = function (book, chapter)
{
    if (chapter.need_save == false) 
    {
        return
    }

    const db = {
        name: chapter.name,
        site: chapter.site,
        content: chapter.content,
        url: chapter.url,
    }

    chapter.need_save = null

    md_db.upsert("chapter", { book: book.name, index: chapter.index }, db)
}

me.get = function (name) {
    return data[name]
}

me.get_all = function (name) {
    return data
}