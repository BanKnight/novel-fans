const fs = require("fs")
const cheerio = require("cheerio")
const assert = require("assert")

const me = server.get("test")
const data = me.data

const md_loader = server.get("loader")

const web_site = {}

me.start = async function()
{

    assert(web_site)

    setTimeout(async()=>
    {
        let infos = await web_site.search("修真聊天群")

        let book = infos[0]

        await web_site.fetch(book)

    },100)


    if(true)
    {
        // console.dir(book)

        return true
    }

    await web_site.fetch_catalog(book)
    await web_site.fetch_catalog(book)
    // await web_site.fetch_content(book)

    web_site.update(book)

 

    // async function load_page(url)
    // {
    //     console.log("loading url:" + url)

    //     let dom = await JSDOM.fromURL(url, options)

    //     return dom.window
    // }

    // async function load_body(url)
    // {
    //     console.log("loading url:" + url)

    //     let dom = await JSDOM.fromURL(url, options)

    //     return dom.window.document.body
    // }

    // let web_site = "https://yd.sogou.com"

    // let book_name = "修真聊天群"

    // let books = {}

    // {

    //     /*
    //     搜索：https://yd.sogou.com/h5/search?query=修真聊天群，获取书的索引 bkey
    //     书的主页：https://yd.sogou.com/h5/cpt/detail?bkey=DFFBD9CAEDA706297C4264E7C7AD4D86
    //     目录获取：post : https://yd.sogou.com/h5/cpt/ajax/detail，formdata :{bkey : 上面的bkey,p:页码,asc:排序}
    //     https://yd.sogou.com/h5/cpt/chapter?bkey=DFFBD9CAEDA706297C4264E7C7AD4D86&ckey=9ACFA318977018F62E39947CAD27B9CD
    //     */

    //     //wap.sogou.com/web/searchList.jsp?keyword=修真聊天群
    //     //http://k.sogou.com/vrtc/list?me=4045444364269123262

    //     let document = await load_body(`${web_site}/0_0_0_0_heat/?keyword=${book_name}`)

    //     // console.log(document.body.innerHTML)

    //     // 注意 如果有和搜索的名字一致的话 就会出现 mark 标签
    //     let pages = document.querySelectorAll(".fl .clear")

    //     for(var i = 0,len = pages.length;i < len;++i)
    //     {
    //         let this_book = pages[i]
    //         let book = {}

    //         book.url = this_book.getAttribute("href")
    //         book.title = this_book.querySelector(".book-title").innerHTML
    //         // book.desc = this_book.querySelector(".book-desc").innerHTML

    //         books[book.title] = book

    //         break
    //     }

    // }

    // for(let title in books)
    // {
    //     let book = books[title]

    //     let page = await load_body(`${web_site}${book.url}`)

    //     book.catalog_url = page.querySelector(".book-status").getAttribute("href")
    // }

    // for(let title in books)
    // {
    //     let book = books[title]

    //     let page = await load_page(`${web_site}${book.catalog_url}`)

    //     page.eval(`document.body.innerHTML = window.g_data.volumes`)

    //     // if(page.g_data)
    //     // {
    //     //     console.log("got it")

    //     //     fs.writeFileSync("./page.html",page.document.documentElement.outerHTML)
    //     // }

    //     page = page.document.body

    //     console.log(page.innerHTML)

    //     let chapters_html = page.querySelectorAll(".chapter-li-a ")

    //     // console.log(page.innerHTML)
    //     console.log("there are :" + chapters_html.length)

    //     book.chapters = []

    //     for(let i = 0,len = chapters_html.length;i < len;++i)
    //     {
    //         let chapter_html = chapters_html[i]
    //         let chapter = {}

    //         chapter.title = chapter_html.querySelector(".chapter-index ").innerHTML
    //         chapter.url = chapter_html.getAttribute("href")

    //         book.chapters.push(chapter)

    //         console.dir(chapter)

    //         break
    //     }
    // }
    // // console.dir(books)

    return true
}

web_site.name = "sogou"
web_site.url = "https://yd.sogou.com"
web_site.headers = {
    'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
    'Content-Language': 'zh-CN',
    'Content-Type': 'text/html; charset=utf-8',
}

//https://yd.sogou.com/h5/search?query=修真聊天群
web_site.search = async function(name)
{
    let books = []

    let body = await md_loader.get("sogou",`${this.url}/h5/search`,{query : name})

    fs.writeFileSync("search.html",body)

    let $ = cheerio.load(body,{decodeEntities: false})
    let result_html = $(".result-wrap-match")

    let title_html = $("em",".result-title",result_html)
    let author_html = $("strong",".result-author",result_html)
    let summary_html = $(".result-summary",result_html)

    let book = {
        from : web_site.name,
        bkey : result_html.attr("bkey"),
        title : title_html.html(),
        author : author_html.html(),
        summary : summary_html.html(),
    }

    books.push(book)

    return books
}

//目录获取：post : https://yd.sogou.com/h5/cpt/ajax/detail，formdata :{bkey : 上面的bkey,p:页码,asc:排序 / desc}
web_site.fetch = async function(book)
{
    let that = this

    let options = {
        url : `${that.url}/h5/cpt/ajax/detail`,
        headers : this.headers,
    }

    let url = `${that.url}/h5/cpt/ajax/detail`

    book.chapters = []

    let parse_page = function(items)
    {
        for(let i = 0,len = items.length;i < len;++i)
        {
            let item = items[i]

            book.chapters.push({
                ckey : item.ckey,
                name : item.name,
                index : item.index,
                update : item.updateTime,
            })
        }

        console.log(`add ${items.length},total size:${book.chapters.length}`)
    }

    let curr_page = 0,total_pages = 100

    for(let i = 0;i < 1000;++i)
    {
        curr_page ++

        if(curr_page > total_pages)
        {
            break
        }

        let body = await md_loader.post("sogou",url,{bkey:book.bkey,p : curr_page,asc:"asc"})

        let info = JSON.parse(body)

        // console.dir(info)

        console.log(`parsing page,page:${info.list.curPage},total:${info.list.totalPages}`)

        parse_page(info.list.items)

        curr_page = info.list.curPage
        total_pages = info.list.totalPages

    }

    try
    {
        fs.mkdirSync("./novels")
    }
    catch(err)
    {

    }

    let folder = `./novels/${book.title}`

    try
    {
        fs.mkdirSync(folder)
    }
    catch(err)
    {

    }

    //https://yd.sogou.com/h5/cpt/chapter?
    for(let i = 0,len = book.chapters.length;i < len;++i)
    {
        let chapter = book.chapters[i]

        if(chapter.content)
        {
            continue
        }

        let html = await md_loader.get("sougo",`${that.url}/h5/cpt/chapter`,{bkey : book.bkey,ckey : chapter.ckey})

        let $ = cheerio.load(html,{decodeEntities: false})

        let text_html = $("#text")

        chapter.content = text_html.html()

        fs.writeFileSync(`${folder}/${chapter.name}.html`,chapter.content)

        if(i % 10 == 0)
        {
            console.log("has already write:" + i)
        }

    }

    console.log("done")
}