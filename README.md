# novel-fans
一个用nodejs实现的爬虫小说网站，模仿的微信的样式，良好的使用体验
## 效果
[点击这个](http://novel.mustbe.cool)

# 特性如下
+ 书架
+ 日/夜主题切换
+ 搜索
+ 书籍基本信息
+ 书籍目录
+ 书籍正文
+ 查看日志
+ 登陆功能
+ 自动更新


# 数据库结构
## basic:记录书的基本信息
书的名称做为索引，不考虑同名
+ _id/name:名字
+ author:作者
+ summary:简介
+ site:来源网站的名字
+ last:上次更新的时间
+ last_read:上次被人读过的时间

## chapter:记录书的章节内容

book + index:联合成为key

+ book:对应的书
+ index:目录中的顺序
+ name:章节名称
+ content:正文的html
+ update:上次更新时间
+ url:正文的链接

## logs:记录爬虫的日志,最多100条
+ _id:生成的自动id
+ content:内容
+ update:记录的时间

