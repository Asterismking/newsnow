import process from "node:process"
import type { NewsItem } from "@shared/types"
import type { CacheInfo } from "../types"

// 简单的 Redis HTTP 客户端，专门用于 Vercel Edge 环境
class RedisClient {
  private url: string
  private token: string

  constructor() {
    // 自动读取我们刚才配好的变量
    this.url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || ""
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || ""
  }

  async command(command: string, ...args: any[]) {
    if (!this.url || !this.token) return null
    
    // 使用 fetch 发送 HTTP 请求，完美支持 Edge 环境
    const res = await fetch(`${this.url}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify([command, ...args]),
    })
    
    const json: any = await res.json()
    return json.result
  }
}

export class Cache {
  private redis: RedisClient
  
  constructor() {
    this.redis = new RedisClient()
  }

  // Redis 不需要像 SQL 那样建表，所以这里留空即可
  async init() {
    logger.success(`init cache (redis mode)`)
  }

  async set(key: string, value: NewsItem[]) {
    const now = Date.now()
    const payload = {
      id: key,
      updated: now,
      data: value // 直接存对象，不需要 stringify，因为 redis command 会处理
    }
    // 将整个对象存为一个 JSON 字符串
    await this.redis.command("SET", key, JSON.stringify(payload))
    logger.success(`set ${key} cache`)
  }

  async get(key: string): Promise<CacheInfo | undefined> {
    const result = await this.redis.command("GET", key)
    if (result) {
      try {
        // 解析取回来的 JSON
        const parsed = JSON.parse(result)
        logger.success(`get ${key} cache`)
        return {
          id: parsed.id,
          updated: parsed.updated,
          items: parsed.data, // 注意这里对应上面存的 data
        }
      } catch (e) {
        return undefined
      }
    }
  }

  async getEntire(keys: string[]): Promise<CacheInfo[]> {
    if (keys.length === 0) return []
    
    // 使用 MGET 一次性获取所有 key，效率更高
    const results = await this.redis.command("MGET", ...keys)
    
    if (results && Array.isArray(results)) {
      logger.success(`get entire (...) cache`)
      return results
        .filter(item => item !== null) // 过滤掉空的
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
    // 这一行原有的 db 逻辑我们直接忽略，因为我们改用 HTTP 模式了
    if (process.env.ENABLE_CACHE === "false") return
    
    const cacheTable = new Cache()
    // Redis 不需要 init，但为了保持兼容性保留调用
    if (process.env.INIT_TABLE !== "false") await cacheTable.init()
    
    return cacheTable
  } catch (e) {
    logger.error("failed to init database ", e)
  }
}
