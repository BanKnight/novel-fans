const fs = require("fs")
const cheerio = require("cheerio")
const assert = require("assert")

const md_tasks = server.get("tasks")
const md_crawler = server.get("crawler")

const me = server.get("test")
const data = me.data


const web_site = {}

me.start = async function () {
    server.run_after(1000, async () => {
        console.log("begin test")
        me.test_search_book()
    })

    return true
}

me.test_search_book = async () => {
    // me.test_task()
    // me.test_request()
    me.test_my_request()
}

me.test_my_request = ()=>
{
    let request = require("../../kernel/request")
    let count = 0

    let request_catalog = (curr_page)=>
    {
        if(curr_page > 30)
        {
            return
        }

        console.log("before request")

        request.get({url : "https://yd.sogou.com/h5/cpt/ajax/detail",qs:
            {
                bkey: 'DFFBD9CAEDA706297C4264E7C7AD4D86', p: curr_page, asc: "asc" 
            }},
            (error, response, body) => {
                if (error) {
                    console.log(`got an error : ${error}`)
                                    
                    request_catalog(curr_page)

                    return
                }
                if (response.statusCode != 200) {
                    console.log("error")
                    return
                }

                // console.log(body)

                count ++

                let info = JSON.parse(body)

                console.log(`get ${info.list.curPage},count : ${count}`)

                request_catalog(++curr_page)
            })
        
    }

    request.get({url : "https://yd.sogou.com/h5/search",qs : { query: "修真聊天群" } }, (err,resp,body) => {

        // console.log("finish search:" + body)

        fs.writeFileSync("search.html",body)

        for(var i = 1; i <= 1;++i)
        {
            request_catalog(i)
        }

    })
}

me.test_task = async() => {
    let book = await md_tasks.search("修真聊天群")
}

me.test_request = () => {

    let request = require("request")
    let count = 0

    let request_catalog = (curr_page)=>
    {
        if(curr_page > 30)
        {
            return
        }

        console.log("before request")

        request.get({url :"https://yd.sogou.com/h5/cpt/ajax/detail",params:
            {
                qs: { bkey: 'DFFBD9CAEDA706297C4264E7C7AD4D86', p: curr_page, asc: "asc" },
                gzip: true,
                timeout: 3000,
                keepAlive : false,
            }},
            (error, response, body) => {
                if (error) {
                    console.log(`got an error : ${error}`)
                                    
                    request_catalog(curr_page)

                    return
                }
                if (response.statusCode != 200) {
                    console.log("error")
                    return
                }

                count ++

                let info = JSON.parse(body)

                console.log(`get ${info.list.curPage},count : ${count}`)

                request_catalog(++curr_page)
            })
        
    }

    request.get({url : "https://yd.sogou.com/h5/search"}, () => {

        console.log("finish search")

        for(var i = 1; i <= 1;++i)
        {
            request_catalog(i)
        }

    })



}

web_site.name = "sogou"
web_site.url = "https://yd.sogou.com"
web_site.headers = {
    'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
    'Content-Language': 'zh-CN',
    'Content-Type': 'text/html; charset=utf-8',
}

//https://yd.sogou.com/h5/search?query=修真聊天群
web_site.search = async function (name) {
    let body = await md_crawler.get("sogou", `${this.url}/h5/search`, { query: name })

    fs.writeFileSync("search.html", body)

    let $ = cheerio.load(body, { decodeEntities: false })
    let result_html = $(".result-wrap-match")

    let title_html = $("em", ".result-title", result_html)
    let author_html = $("strong", ".result-author", result_html)
    let summary_html = $(".result-summary", result_html)

    let book = {
        from: web_site.name,
        bkey: result_html.attr("bkey"),
        title: title_html.html(),
        author: author_html.html(),
        summary: summary_html.html(),
    }

    return book
}

//目录获取：post : https://yd.sogou.com/h5/cpt/ajax/detail，formdata :{bkey : 上面的bkey,p:页码,asc:排序 / desc}
web_site.fetch = async function (book) {
    let that = this

    let options = {
        url: `${that.url}/h5/cpt/ajax/detail`,
        headers: this.headers,
    }

    let url = `${that.url}/h5/cpt/ajax/detail`

    book.chapters = []

    let parse_page = function (items) {
        for (let i = 0, len = items.length; i < len; ++i) {
            let item = items[i]

            book.chapters.push({
                ckey: item.ckey,
                name: item.name,
                index: item.index,
                update: item.updateTime,
            })
        }

        console.log(`add ${items.length},total size:${book.chapters.length}`)
    }

    let curr_page = 0, total_pages = 100

    for (let i = 0; i < 1000; ++i) {
        curr_page++

        if (curr_page > total_pages) {
            break
        }

        let body = await md_crawler.post("sogou", url, { bkey: book.bkey, p: curr_page, asc: "asc" })

        let info = JSON.parse(body)

        // console.dir(info)

        console.log(`parsing page,page:${info.list.curPage},total:${info.list.totalPages}`)

        parse_page(info.list.items)

        curr_page = info.list.curPage
        total_pages = info.list.totalPages

    }

    try {
        fs.mkdirSync("./novels")
    }
    catch (err) {

    }

    let folder = `./novels/${book.title}`

    try {
        fs.mkdirSync(folder)
    }
    catch (err) {

    }

    //https://yd.sogou.com/h5/cpt/chapter?
    for (let i = 0, len = book.chapters.length; i < len; ++i) {
        let chapter = book.chapters[i]

        if (chapter.content) {
            continue
        }

        let html = await md_crawler.get("sougo", `${that.url}/h5/cpt/chapter`, { bkey: book.bkey, ckey: chapter.ckey })

        let $ = cheerio.load(html, { decodeEntities: false })

        let text_html = $("#text")

        chapter.content = text_html.html()

        fs.writeFileSync(`${folder}/${chapter.name}.html`, chapter.content)

        if (i % 10 == 0) {
            console.log("has already write:" + i)
        }

    }

    console.log("done")
}