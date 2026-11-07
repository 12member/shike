/**
 * 食刻 · 本地服务器
 *
 * 两个作用：
 *   1. 把静态文件跑起来（直接双击 index.html 也能用，但用 file:// 打开时 localStorage 有坑）
 *   2. 代调识别接口，把 API Key 留在服务端，不暴露给浏览器
 *
 * 用法：
 *   node server.js                                  # 只开静态服务，拍照识别不用
 *   VISION_API_URL=... VISION_API_KEY=... VISION_MODEL=... node server.js
 *
 * 零依赖，不用 npm install。
 */

const http = require('http')
const fs = require('fs')
const path = require('path')
const https = require('https')

const PORT = Number(process.env.PORT || 5178)
const API_URL = process.env.VISION_API_URL || ''
const API_KEY = process.env.VISION_API_KEY || ''
const MODEL = process.env.VISION_MODEL || ''

const ROOT = __dirname

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
}

const PROMPT = `你是专业营养师，从这张餐食照片里识别食物并估算分量与营养。

规则：
1. 只识别照片里真实看得到的，不要脑补桌上没有的。
2. 逐项列出主食、菜、汤、饮料、酱料；油多的做法（红烧/油炸/干锅）在 note 里点出来。
3. 按可食用部分估算克数。参照：一个标准饭碗约 200g 米饭，一个鸡蛋约 50g，一罐可乐 330ml，一份炒菜约 150~200g。
4. 热量与三大营养素按你估的重量算，单位 kcal 和 g。
5. 拿不准的 confidence 给 0.3~0.5，并写明原因。
6. 照片里没有食物时 items 返回空数组。

只输出 JSON，不要解释、不要 markdown 代码块：
{"items":[{"name":"白米饭","gram":180,"kcal":209,"carb":46.6,"pro":4.7,"fat":0.5,"confidence":0.9,"note":""}],"note":"整餐说明，40字以内","confidence":0.8}`

/* ---------------- 工具 ---------------- */

function send(res, code, obj, type) {
  const body = typeof obj === 'string' ? obj : JSON.stringify(obj)
  res.writeHead(code, {
    'Content-Type': type || 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  })
  res.end(body)
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', c => {
      size += c.length
      if (size > limit) {
        reject(new Error('内容太大'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function postJSON(urlStr, headers, body, timeout) {
  return new Promise((resolve, reject) => {
    let u
    try { u = new URL(urlStr) } catch (e) { return reject(new Error('VISION_API_URL 不是合法地址')) }

    const data = JSON.stringify(body)
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: Object.assign({
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }, headers)
    }, res => {
      let buf = ''
      res.setEncoding('utf8')
      res.on('data', c => (buf += c))
      res.on('end', () => resolve({ status: res.statusCode, body: buf }))
    })

    req.on('error', reject)
    req.setTimeout(timeout || 55000, () => req.destroy(new Error('模型响应超时')))
    req.write(data)
    req.end()
  })
}

function extractJSON(text) {
  if (!text) return null
  let s = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const a = s.indexOf('{')
  const b = s.lastIndexOf('}')
  if (a === -1 || b <= a) return null
  try { return JSON.parse(s.slice(a, b + 1)) } catch (e) { return null }
}

function num(v, min, max, fb) {
  const n = Number(v)
  if (!isFinite(n)) return fb
  return Math.min(max, Math.max(min, n))
}

function sanitize(raw) {
  const items = Array.isArray(raw && raw.items) ? raw.items : []
  const cleaned = items.filter(it => it && it.name).slice(0, 20).map(it => ({
    name: String(it.name).slice(0, 24),
    gram: Math.round(num(it.gram, 5, 2000, 100)),
    kcal: Math.round(num(it.kcal, 0, 5000, 0)),
    carb: +num(it.carb, 0, 500, 0).toFixed(1),
    pro: +num(it.pro, 0, 500, 0).toFixed(1),
    fat: +num(it.fat, 0, 500, 0).toFixed(1),
    conf: it.confidence == null ? null : +num(it.confidence, 0, 1, 0.6).toFixed(2),
    note: it.note ? String(it.note).slice(0, 40) : ''
  })).filter(it => it.kcal > 0 || it.gram > 0)

  return {
    items: cleaned,
    note: raw && raw.note ? String(raw.note).slice(0, 60) : '',
    confidence: raw && raw.confidence != null ? +num(raw.confidence, 0, 1, 0.6).toFixed(2) : null
  }
}

/* ---------------- 识别接口 ---------------- */

async function handleRecognize(req, res) {
  if (!API_URL || !API_KEY || !MODEL) {
    return send(res, 200, {
      ok: false,
      error: '服务端没配模型。启动时带上 VISION_API_URL / VISION_API_KEY / VISION_MODEL'
    })
  }

  let payload
  try {
    payload = JSON.parse(await readBody(req, 12 * 1024 * 1024))
  } catch (e) {
    return send(res, 200, { ok: false, error: '请求格式不对，或者图片太大' })
  }

  const img = payload.image
  if (!img || typeof img !== 'string' || img.indexOf('data:image/') !== 0) {
    return send(res, 200, { ok: false, error: '没有收到图片' })
  }

  const body = {
    model: payload.model || MODEL,
    temperature: 0.2,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: img } },
        { type: 'text', text: PROMPT }
      ]
    }]
  }

  let resp
  try {
    resp = await postJSON(API_URL, { Authorization: 'Bearer ' + API_KEY }, body, 55000)
  } catch (e) {
    return send(res, 200, { ok: false, error: e.message || '调用模型失败' })
  }

  if (resp.status < 200 || resp.status >= 300) {
    let detail = ''
    try {
      const j = JSON.parse(resp.body)
      detail = (j.error && (j.error.message || j.error.code)) || ''
    } catch (e) {}
    return send(res, 200, { ok: false, error: `模型接口返回 ${resp.status}${detail ? '：' + detail : ''}` })
  }

  let content = ''
  try {
    const j = JSON.parse(resp.body)
    const msg = j.choices && j.choices[0] && j.choices[0].message
    if (!msg) return send(res, 200, { ok: false, error: '模型没返回内容' })
    content = typeof msg.content === 'string'
      ? msg.content
      : Array.isArray(msg.content) ? msg.content.map(c => c.text || '').join('') : ''
  } catch (e) {
    return send(res, 200, { ok: false, error: '模型返回格式不认识' })
  }

  const parsed = extractJSON(content)
  if (!parsed) return send(res, 200, { ok: false, error: '没能解析出食物清单' })

  const data = sanitize(parsed)
  if (!data.items.length) return send(res, 200, { ok: false, error: '图里没认出食物，换个角度试试' })

  send(res, 200, { ok: true, data })
}

/* ---------------- 静态文件 ---------------- */

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname.split('?')[0])
  if (rel === '/' || rel === '') rel = '/index.html'

  const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''))
  if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8')

  fs.readFile(file, (err, buf) => {
    if (err) {
      if (req.headers.accept && req.headers.accept.indexOf('text/html') > -1) {
        return fs.readFile(path.join(ROOT, 'index.html'), (e2, b2) => {
          if (e2) return send(res, 404, 'Not found', 'text/plain; charset=utf-8')
          send(res, 200, b2.toString('utf8'), MIME['.html'])
        })
      }
      return send(res, 404, 'Not found', 'text/plain; charset=utf-8')
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': buf.length,
      'Cache-Control': 'no-cache'
    })
    res.end(buf)
  })
}

/* ---------------- 启动 ---------------- */

const server = http.createServer((req, res) => {
  const pathname = (req.url || '/').split('?')[0]

  if (pathname === '/api/recognize' && req.method === 'POST') {
    return handleRecognize(req, res)
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed', 'text/plain; charset=utf-8')
  }
  serveStatic(req, res, pathname)
})

server.listen(PORT, () => {
  console.log('')
  console.log('  食刻 · 网页版')
  console.log('  ----------------------------------------')
  console.log('  打开：http://localhost:' + PORT)
  console.log('  识别服务：' + (API_URL && API_KEY ? '已接 ' + MODEL : '未配置（拍照识别不可用，其余功能正常）'))
  if (!API_URL) {
    console.log('')
    console.log('  要开拍照识别，这样启动：')
    console.log('  VISION_API_URL=https://api.hunyuan.cloud.tencent.com/v1/chat/completions \\')
    console.log('  VISION_API_KEY=sk-xxxx \\')
    console.log('  VISION_MODEL=hunyuan-vision node server.js')
  }
  console.log('')
})
