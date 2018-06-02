# novel-fans
一个爬虫小说网站，目前只爬了 yd.sogou.com

# 数据库结构
## basic:记录书的基本信息
书的名称做为索引，不考虑同名
+ _id/name:名字
+ author:作者
+ summary:简介
+ site:来源网站的名字
+ last:上次被阅读的时间

## chapter:记录书的章节内容

book + index:联合成为key

+ book:对应的书
+ index:目录中的顺序
+ name:章节名称
+ content:正文的html
+ update:上次更新时间

## tasks : 记录需要爬取内容的书
+ _id/name : 名字

## logs:记录爬虫的日志,最多1000条
+ _id:生成的自动id
+ content:内容
+ update:记录的时间

