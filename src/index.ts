import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Demo } from './demo'
import { v4 as uuidv4 } from 'uuid'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// 配置 CORS
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Type', 'Content-Length'],
  maxAge: 86400,
}))

// 演示页面 - 与首页相同
app.get('/demo', (c) => {
  return c.html(Demo)
})

// 处理文件上传 - POST 请求
app.post('/', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, message: 'No file uploaded' }, 400)
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