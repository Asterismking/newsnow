import process from "node:process"
import type { NewsItem } from "@shared/types"
import type { CacheInfo } from "../types"

class RedisClient {
  private url: string
  private token: string

  constructor() {
    // 1. 获取变量
    let rawUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || ""
    let rawToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || ""

    // 2. 清洗变量 (关键修复：去掉可能存在的引号和空格)
    // 很多时候复制粘贴会带上 "" 或空格，这里强制去掉
    this.url = rawUrl.replace(/["'\s]/g, "") 
    this.token = rawToken.replace(/["'\s]/g, "")

    // 3. 打印日志帮助排查 (在 Vercel Logs 里能看到)
    if (!this.url) {
      console.error("【严重警告】Redis URL 为空！缓存功能将失效。")
    } else if (!this.url.startsWith("http")) {
      console.error(`【严重警告】Redis URL 格式错误 (必须以 http 开头): ${this.url}`)
      this.url = "" // 置空以防报错
    }
  }

  async command(command: string, ...args: any[]) {
    // 如果 URL 不对，直接返回 null，绝对不让网站崩溃
    if (!this.url || !this.token) return null
    
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify([command, ...args]),
      })
      
      const json: any = await res.json()
      return json.result
    } catch (e) {
      console.error("Redis 请求失败:", e)
      return null
    }
  }
}

export class Cache {
  private redis: RedisClient
  
  constructor() {
    this.redis = new RedisClient()
  }

  async init() {
    // 这里的 log 也可以看到是否初始化成功
    // logger.success(`init cache (redis mode)`) 
  }

  async set(key: string, value: NewsItem[]) {
    const now = Date.now()
    const payload = {
      id: key,
      updated: now,
      data: value
    }
    await this.redis.command("SET", key, JSON.stringify(payload))
  }

  async get(key: string): Promise<CacheInfo | undefined> {
    const result = await this.redis.command("GET", key)
    if (result) {
      try {
        const parsed = JSON.parse(result)
        return {
          id: parsed.id,
          updated: parsed.updated,
          items: parsed.data,
        }
      } catch (e) {
        return undefined
      }
    }
  }

  async getEntire(keys: string[]): Promise<CacheInfo[]> {
    if (keys.length === 0) return []
    const results = await this.redis.command("MGET", ...keys)
    
    if (results && Array.isArray(results)) {
      return results
        .filter(item => item !== null)
        .map(item => {
           try {
             const parsed = JSON.parse(item)
             return {
                id: parsed.id,
                updated: parsed.updated,
                items: parsed.data as NewsItem[]
             }
           } catch (e) {
             return null
           }
        })
        .filter(Boolean) as CacheInfo[]
    } else {
      return []
    }
  }

  async delete(key: string) {
    return await this.redis.command("DEL", key)
  }
}

export async function getCacheTable() {
  try {
    if (process.env.ENABLE_CACHE === "false") return
    const cacheTable = new Cache()
    return cacheTable
  } catch (e) {
    console.error("failed to init database ", e)
  }
}
