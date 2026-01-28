import * as cheerio from "cheerio"

export default defineSource(async () => {
  // 这里是你用 RSS.app 生成的那个链接 
  const url = "https://rss.app/feeds/FvmjX50LfnLnPZyk.xml"
  
  // 获取 XML 内容
  const xml = await myFetch(url)
  
  // 使用 xml 模式解析
  const $ = cheerio.load(xml, { xmlMode: true })
  
  // 提取所有 item 标签
  const items = $("item").map((_, el) => {
    const $el = $(el)
    return {
      // 提取标题
      title: $el.find("title").text(),
      // 提取链接
      url: $el.find("link").text(),
      // 提取发布时间 (可选)
      extra: {
        date: $el.find("pubDate").text(),
        info: "AMZ123",
      },
    }
  }).get()

  return items
})
