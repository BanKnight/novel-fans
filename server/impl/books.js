const assert = require("assert")

const config = global.config
const server = global.server

const md_db = server.get("db")
const md_tasks = server.get("tasks")

const me = server.get("books")
const data = me.data

me.start = async()=>
{
    let db_data = await md_db.load("basic")

    for(let db_one_data in db_data)
    {
        let book = {
            name : db_one_data._id,
            author : db_one_data.author,
            summary : db_one_data.summary,
            site : db_one_data.site,
            last : db_one_data.last || 0,

            chapters : {},
            count : 0,              //章节数量
        }

        data[book.name] = book
    }

    console.log(`has ready load ${db_data.length} books`)

    await md_db.index("chapter",{book : 1,index : 1})   //设置索引

    db_data = await md_db.load("chapter")

    for(let db_one_data in db_data)
    {
        let book = data[db_one_data.book]
        if(book == null)
        {
            console.log("no such book in basic:" + db_one_data.book)
            continue
        }

        let chapter = {
            book : db_one_data.book,
            index : db_one_data.index,      //从1开始
            name : db_one_data.name,
            content : db_one_data.content,
        }

        book.chapters[chapter.index] = chapter
        book.count ++
    }

    console.log(`has ready load ${db_data.length} chapters`)

    return true
}

me.add = (book)=>
{
    assert(data[book.name] == null)

    data[book.name] = book

    {   // basic
        const db = {
            author : book.author,
            summary : book.summary,
            site : book.site,
            last : book.last || Date.now(),
        }

        md_db.upsert("basic",{_id : book.name},db)
    }

    for(let index in book.chapters)
    {   //chapter
        let chapter = book.chapters[index]

        const db = {
            name : chapter.name,
            content : chapter.content
        }

        md_db.upsert("chapter",{book : book.name,index : index},db)
    }

}

// 用于一本小说有更新后，写入更新的部分到db
me.update = (book)=>
{
    for(let last = book.count,first = 1;last >= first;--last)
    {
        let chapter = book.chapters[last]
        if(chapter.need_save == true)
        {
            const db = {
                name : chapter.name,
                content : chapter.content
            }

            chapter.need_save = null

            md_db.upsert("chapter",{book : book.name,index : index},db)
        }
        else
        {
            break
        }
    }
}

me.get = function(name)
{
    return data[name]
}

me.get_all = function(name)
{
    return data
}