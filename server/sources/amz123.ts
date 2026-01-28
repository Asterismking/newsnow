import * as cheerio from "cheerio"

export default defineSource({
  "amz123": async () => {
    const url = "https://rss.app/feeds/FvmjX50LfnLnPZyk.xml"
    const xml = await myFetch(url)
    const $ = cheerio.load(xml, { xmlMode: true })

    return $("item").map((_, el) => {
      const $el = $(el)
      const link = $el.find("link").text()
      const title = $el.find("title").text()

      return {
        id: link, // ✅ 必须有这一行！
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
