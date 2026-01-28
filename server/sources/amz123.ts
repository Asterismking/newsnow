import * as cheerio from "cheerio"

// 注意：这里我们导出一个对象，键名必须是 "amz123"
export default defineSource({
  "amz123": async () => {
    const url = "https://rss.app/feeds/FvmjX50LfnLnPZyk.xml"
    const xml = await myFetch(url)
    const $ = cheerio.load(xml, { xmlMode: true })
    
    return $("item").map((_, el) => {
      const $el = $(el)
      return {
        title: $el.find("title").text(),
        url: $el.find("link").text(),
        extra: {
          date: $el.find("pubDate").text(),
          info: "AMZ123",
        },
      }
    }).get()
  }
})
