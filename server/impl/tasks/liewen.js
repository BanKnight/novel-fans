let fs = require("fs")
var iconv = require('iconv-lite');  
let web_site = {}

module.exports = web_site

web_site.init = (env)=>
{
    web_site.env = env
    web_site.url = "https://www.liewen.cc"

    web_site.crawler = env.crawler
    web_site.cheerio = env.cheerio
    web_site.logs = env.logs
}

web_site.search = async(name)=>
{
    web_site.logs.add(`[${web_site.name}]search_basic start : ${name}`)

    let book = await web_site.search_basic(name)

    if(book.name != name)
    {
        web_site.logs.add(`[${web_site.name}] no such book : ${name}`)
        return 
    }

    web_site.logs.add(`[${web_site.name}]search_catalog start : ${name}`)

    await web_site.search_catalog(book)

    web_site.logs.add(`[${web_site.name}]search_chapters start : ${name}`)

    await web_site.search_chapters(book,0,book.count - 1)

    web_site.logs.add(`[${web_site.name}]search_chapters done : ${name}`)

    return book
}

web_site.search_basic = async(name)=>
{
    let url = `${web_site.url}/search.php`

    console.log("url is : " + url)

    let body = await web_site.crawler.get(web_site.name,url,{keyword : name})

    let $ = web_site.cheerio.load(body,{decodeEntities: false})

    let first_result = $(".am-result-item.result-game-item")[0]
    let book_html = $(".result-game-item-title-link",first_result)

    let book_ref = book_html.attr("href")

    console.log("book ref is:" + book_ref)

    book_html = await web_site.crawler.get(web_site.name,book_ref)

    book_html = iconv.decode(book_html,'gb2312'); 

    // fs.writeFileSync("book.html",book_html)

    $ = web_site.cheerio.load(book_html,{decodeEntities: false})

    let basic_html = $("#info")

    let title_html = $("h1",basic_html)
    let author_html = $("p",basic_html)
    let summary_html = $("#intro")

    let catalog_html = $("#list")

    // console.dir(author_html.html().split("："))

    let book = {
        name : title_html.html(),
        site : web_site.name,
        author : author_html.html().split("：")[1],
        summary : summary_html.html(),
        count : 0,

        temp :{
            url:book_ref,                   
            catalog_html : catalog_html,//用来抓取目录
            $ : $,
        }
    }

    // console.dir(book)

    return book
}

//目录获取：get : https://yd.sogou.com/h5/cpt/ajax/detail，formdata :{bkey : 上面的bkey,p:页码,asc:排序 / desc}
web_site.search_catalog = async(book)=>
{
    book.chapters = []

    let $ = book.temp.$
    let all_items = $("a",book.temp.catalog_html)

    $("a",book.temp.catalog_html).each(function(i, elem) {
        
        let html = $(this)

        book.chapters.push({
            book : book.name,
            name : html.html(),
            index : book.count,
            update : Date.now(),
            url : `${web_site.url}${html.attr("href")}`,
        })

        book.count++
    });

    // console.dir(book.chapters)
}

web_site.search_chapters = async(book,start,stop)=>
{
    for(let i = start;i <= stop;++i)
    {
        let chapter = book.chapters[i]
        if(chapter == null)
        {
            continue
        }

        if(chapter.content)
        {
            continue
        }
        
        let html = await web_site.crawler.get(web_site.name,chapter.url)

        html = iconv.decode(html,'gb2312'); 

        let $ = web_site.cheerio.load(html,{decodeEntities: false})

        chapter.content = $("#content").html()        //这里有加入书签的html代码
        chapter.need_save = true

        if(i % 50 == 0)
        {
            web_site.logs.add(`[${web_site.name}]fetching content ${book.name},count : ${i} / ${book.count},chapter:${chapter.name}`)
        }
    }
}

web_site.update = async(book)=>
{
    // let curr_page = 0,total_pages = 100
    // let old_count = book.count

    // for(let i = 0;i < 1000;++i)             //最多获取1000页
    // {
    //     curr_page ++

    //     if(curr_page > total_pages)
    //     {
    //         break
    //     }

    //     let body = await web_site.crawler.get(web_site.name,url,{bkey:book.bkey,p : curr_page,asc:"desc"})

    //     let info = JSON.parse(body)

    //     try
    //     {
    //         // console.log(`parsing page,page:${info.list.curPage},total:${info.list.totalPages}`)

    //         if(web_site.parse_catalog(book,info.list.items) == false)
    //         {
    //             break
    //         }
    //     }
    //     catch(err)
    //     {
    //         console.log(err)
    //         break
    //     }
 
    //     curr_page = info.list.curPage
    //     total_pages = info.list.totalPages
    // }

    // if(book.count > old_count)
    // {
    //     web_site.search_chapters(book,old_count,book.count - 1)
    // }

    // return book.count > old_count
}