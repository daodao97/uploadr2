import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Demo } from './demo'
import { v4 as uuidv4 } from 'uuid'
import { sign, verify } from 'hono/jwt'

type Variables = {
  tokenPayload: TokenPayload
}

const app = new Hono<{
  Bindings: CloudflareBindings
  Variables: Variables
}>()

type TokenPayload = {
  exp: number
  maxSize: number
  allowedTypes: string[]
}

// 配置 CORS
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Upload-Token'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Type', 'Content-Length'],
  maxAge: 86400,
}))

// 演示页面 - 与首页相同
app.get('/demo', (c) => {
  return c.html(Demo)
})

// 生成上传令牌的接口
app.post('/get-upload-token', async (c) => {
  try {
    // 从请求头获取内部系统调用的 API Key
    const apiKey = c.req.header('X-API-Key')
    if (apiKey !== c.env.INTERNAL_API_KEY) {
      return c.json({ success: false, message: '无权限生成令牌' }, 403)
    }

    // 生成一个临时的上传令牌
    const payload = {
      exp: Math.floor(Date.now() / 1000) + 3600, // 1小时后过期
      // 可以添加其他限制条件
      maxSize: 10 * 1024 * 1024, // 最大文件大小限制
      allowedTypes: ['image/jpeg', 'image/png'], // 允许的文件类型
    }

    const token = await sign(payload, c.env.JWT_SECRET)
    return c.json({ success: true, token })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

// 验证上传令牌的中间件
async function validateUploadToken(c: any, next: any) {
  try {
    const token = c.req.header('Upload-Token')
    if (!token) {
      return c.json({ success: false, message: '缺少上传令牌' }, 401)
    }

    // 验证令牌
    const payload = await verify(token, c.env.JWT_SECRET) as TokenPayload

    // 检查令牌是否过期
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return c.json({ success: false, message: '令牌已过期' }, 401)
    }

    // 将令牌信息保存到请求上下文中
    c.set('tokenPayload', payload)
    await next()
  } catch (error) {
    return c.json({ success: false, message: '无效的上传令牌' }, 401)
  }
}

// 在上传接口中使用令牌验证
app.post('/', validateUploadToken, async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file')
    const tokenPayload = c.get('tokenPayload') as TokenPayload

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, message: '没有文件上传' }, 400)
    }

    // 验证文件大小
    if (file.size > tokenPayload.maxSize) {
      return c.json({ success: false, message: '文件大小超出限制' }, 400)
    }

    // 验证文件类型
    if (!tokenPayload.allowedTypes.includes(file.type)) {
      return c.json({ success: false, message: '不支持的文件类型' }, 400)
    }

    // 生成唯一文件名
    const fileExtension = file.name.includes('.') ? `.${file.name.split('.').pop()}` : ''
    const fileName = `${uuidv4()}${fileExtension}`

    const path = c.req.path
    const uploadKey = path.slice(1) || fileName

    // 上传文件到 R2 存储桶
    await c.env.MY_BUCKET.put(uploadKey, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
    })

    // 返回文件访问路径
    const url = new URL(c.req.url)
    const uploadFileUrl = `${url.origin}/${uploadKey}`

    return c.json({ success: true, url: uploadFileUrl })
  } catch (error: any) {
    console.error('上传文件错误:', error)
    return c.json({ success: false, message: error.message }, 500)
  }
})

// 处理从 URL 上传文件 - PUT 请求
app.put('/:key', async (c) => {
  try {
    const fileUrl = c.req.param('key')

    if (!fileUrl || (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://'))) {
      return c.json({ success: false, message: 'Invalid URL' }, 400)
    }

    const fileResponse = await fetch(fileUrl)
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch ${fileUrl}: ${fileResponse.statusText}`)
    }

    const fileArrayBuffer = await fileResponse.arrayBuffer()
    const fileName = fileUrl.split('/').pop()

    const res = await c.env.MY_BUCKET.put('' + fileName, fileArrayBuffer, {
      httpMetadata: {
        contentType: fileResponse.headers.get('content-type') || 'application/octet-stream'
      }
    })

    console.log('File uploaded:', res)

    return c.json({
      url: `${new URL(c.req.url).origin}/${res.key}`
    })
  } catch (error: any) {
    console.error('从 URL 上传文件错误:', error)
    return c.json({ success: false, message: error.message }, 500)
  }
})

// 获取文件 - GET 请求
app.get('/:key', async (c) => {
  try {
    const key = c.req.param('key')
    const object = await c.env.MY_BUCKET.get(key)

    if (object === null) {
      return c.text('Object Not Found', 404)
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)

    return new Response(object.body, {
      headers
    })
  } catch (error: any) {
    console.error('获取文件错误:', error)
    return c.text(error.message, 500)
  }
})

// 删除文件 - DELETE 请求
app.delete('/:key', async (c) => {
  try {
    const key = c.req.param('key')
    await c.env.MY_BUCKET.delete(key)
    return c.text('Deleted!')
  } catch (error: any) {
    console.error('删除文件错误:', error)
    return c.text(error.message, 500)
  }
})

export default app