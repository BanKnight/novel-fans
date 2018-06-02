let web_site = {}

module.exports = web_site

web_site.init = (env)=>
{
    this.env = env
    this.url = "https://yd.sogou.com"

    this.crawler = env.crawler
    this.cheerio = env.cheerio

}

web_site.search = async(name)=>
{
    let book = await web_site.search_basic(name)

    await web_site.search_catalog(book)

    await web_site.search_chapters(book)

    return book
}

web_site.search_basic = async(name)=>
{
    let body = web_site.crawler.get(web_site.name,`${web_site.url}/h5/search`,{query : name})

    let $ = web_site.cheerio.load(body,{decodeEntities: false})
    let result_html = $(".result-wrap-match")

    let title_html = $("em",".result-title",result_html)
    let author_html = $("strong",".result-author",result_html)
    let summary_html = $(".result-summary",result_html)

    let book = {
        name : title_html.html(),
        site : web_site.name,
        author : author_html.html(),
        summary : summary_html.html(),
        bkey : result_html.attr("bkey"),
    }

    return book
}

//目录获取：post : https://yd.sogou.com/h5/cpt/ajax/detail，formdata :{bkey : 上面的bkey,p:页码,asc:排序 / desc}
web_site.search_catalog = async(book)=>
{
    let url = `${web_site.url}/h5/cpt/ajax/detail`

    let curr_page = 0,total_pages = 100

    for(let i = 0;i < 1000;++i)             //最多获取1000页
    {
        curr_page ++

        if(curr_page > total_pages)
        {
            break
        }

        let body = await web_site.crawler.post(web_site.name,url,{bkey:book.bkey,p : curr_page,asc:"asc"})

        let info = JSON.parse(body)

        console.log(`parsing page,page:${info.list.curPage},total:${info.list.totalPages}`)

        web_site.parse_catalog(book,info.list.items)

        curr_page = info.list.curPage
        total_pages = info.list.totalPages
    }
}

//https://yd.sogou.com/h5/cpt/chapter?
web_site.search_chapters = async(book)=>
{
    let url = `${web_site.url}/h5/cpt/chapter`

    for(let i = 0,len = book.chapters.length;i < len;++i)
    {
        let chapter = book.chapters[i]

        if(chapter.content)
        {
            continue
        }

        let html = await web_site.crawler.get(web_site.name,url,{bkey : book.bkey,ckey : chapter.ckey})

        let $ = web_site.cheerio.load(html,{decodeEntities: false})

        let text_html = $("#text")

        chapter.content = text_html.html()

        if(i % 10 == 0)
        {
            console.log("has already write:" + i)
        }

    }
}

web_site.parse_catalog = (book,items)=>
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
}