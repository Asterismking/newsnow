import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types" // 建议加上这个类型检查

export default defineSource({
  "amz123": async () => {
    const url = "https://rss.app/feeds/FvmjX50LfnLnPZyk.xml"
    const xml = await myFetch(url)
    const $ = cheerio.load(xml, { xmlMode: true })
    
    // 显式声明返回类型为 NewsItem[]
    return $("item").map((_, el) => {
      const $el = $(el)
      const link = $el.find("link").text()
      const title = $el.find("title").text()

      return {
        id: link, // ✅ 必须加上这一行！用链接作为唯一ID
        title: title,
        url: link,
        extra: {
          date: $el.find("pubDate").text(),
          info: "AMZ123",
        },
      }
    }).get()
  }
})
