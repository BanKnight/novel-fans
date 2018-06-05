let fs = require("fs")
var iconv = require('iconv-lite');  
let web_site = {}

module.exports = web_site

web_site.init = (env)=>
{
    web_site.env = env
    web_site.url = "https://www.liewen.cc"
    web_site.priority = 100
    web_site.crawler = env.crawler
    web_site.cheerio = env.cheerio
    web_site.logs = env.logs
}

web_site.search = async(name)=>
{
    web_site.logs.add(`[${web_site.name}]search_link start : ${name}`)

    let book_url = await web_site.search_link(name)
    if(book_url == null)
    {
        web_site.logs.add(`[${web_site.name}] no such book : ${name}`)
        return
    }

    let book = await web_site.search_basic(book_url)
    if(book == null)
    {
        web_site.logs.add(`[${web_site.name}] no such book : ${name}`)
        return 
    }

    if(book.name != name)
    {
        web_site.logs.add(`[${web_site.name}] no such book : ${name}`)
        return 
    }

    web_site.logs.add(`[${web_site.name}]search_catalog start : ${name}`)

    await web_site.search_catalog(book)

    return book
}

web_site.search_link = async(name)=>
{
    try
    {
        let url = `${web_site.url}/search.php`

        let body = await web_site.crawler.get(web_site.name,url,{keyword : name})
    
        let $ = web_site.cheerio.load(body,{decodeEntities: false})
    
        let first_result = $(".am-result-item.result-game-item")[0]
        let book_html = $(".result-game-item-title-link",first_result)
    
        let book_ref = book_html.attr("href")
    
        return book_ref
    }
    catch(err)
    {
        return
    }

}

web_site.search_basic = async(url)=>
{
    // console.log("url is : " + url)

    let book_html = await web_site.crawler.get(web_site.name,url)

    book_html = iconv.decode(book_html,'gb2312'); 

    let $ = web_site.cheerio.load(book_html,{decodeEntities: false})

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
        summary : del_html_tag(summary_html.html()),
        url : url,
        temp :{
            url:url,                   
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
            index : book.chapters.length,
            update : Date.now(),
            url : `${web_site.url}${html.attr("href")}`,
        })
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

        chapter.site = web_site.name
        chapter.content = $("#content").html()        //这里有加入书签的html代码
        chapter.need_save = true

        if(i % 50 == 0)
        {
            web_site.logs.add(`[${web_site.name}]fetching content ${book.name},count : ${i} / ${book.chapters.length},chapter:${chapter.name}`)
        }
    }
}

web_site.update = async(book)=>
{
    let url = book.url

    if(url == null || book.site != web_site.name)
    {
        url = await web_site.search_link(book.name)

        book.url = url
    }

    let that_book = await web_site.search_basic(url)
    if(that_book == null)
    {
        return false
    }

    await web_site.search_catalog(that_book)

    if(that_book.chapters.length <= book.chapters.length)
    {
        return false
    }

    await web_site.search_chapters(book.chapters.length,that_book.chapters.length - 1)

    for(let i = book.chapters.length,len = that_book.chapters.length;i < len;++i)
    {
        let new_chapter = that_book.chapters[i]

        book.chapters.push(new_chapter)
    }

    return true
}