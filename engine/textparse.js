/**
 * 文字描述 → 食物清单（本地解析，不依赖网络和 API Key）
 *
 * 用户打一句「中午两碗米饭一份红烧肉一杯可乐」，
 * 拆成结构化条目交给他确认。这是兜底方案，配了模型时优先走云函数。
 *
 * 算法：不做「按标点切段」那种脆弱的做法，而是
 *   1) 在整句里从左到右扫出所有食物名（最长匹配优先，不重叠）
 *   2) 每个食物去它前后的空档里认领一个数量词（"一碗"在前、"五串"在后都行）
 *   3) 数量词只能被认领一次，剩下的文字进 unmatched
 *
 * 这样"夜宵烧烤五串啤酒一瓶"能正确拆成 烧烤×5 + 啤酒×1，
 * 而不是把"五"算到啤酒头上。
 */

const fooddb = require('./fooddb')

/* 中文数字 */
const CN_NUM = {
  一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 半: 0.5
}

/* 量词：个数类（按"个"折算单个重量）与容器类（直接按份量算） */
const PIECE_UNITS = ['个', '颗', '只', '条', '片', '根', '块', '串', '粒', '枚']
const UNITS = ['大碗', '小碗', '碗', '份', '份量', '杯', '勺', '盘', '碟', '盒', '包', '瓶', '听', '罐']
  .concat(PIECE_UNITS)
const UNIT_RE = UNITS.join('|')
const NUMBER_RE = new RegExp(`([0-9]+|[一二两三四五六七八九十半])\\s*(${UNIT_RE})`, 'g')

/* 主语、时间、动词等噪音 */
const NOISE_RE = /(我|我们|今天|昨天|早上|上午|中午|下午|傍晚|晚上|夜里|早餐|午餐|晚餐|夜宵|宵夜|加餐|吃了|吃|喝了|喝|点了|来了|加了|加|大概|差不多|大约|左右|可能|估计|一点|一些|少量|还有|另外|外加|和|跟|配|的|了|着)/g

/* 「150克」「300ml」这类直接给重量的写法 */
const WEIGHT_RE = /([0-9]+(?:\.[0-9]+)?)\s*(克|g|G|毫升|ml|ML)/g

/* ---------------- 词典 ---------------- */

/** 库内名 + 口语别名，长词优先 */
const LEXICON = (function build() {
  const map = {}
  fooddb.FOODS.forEach(f => {
    map[f.name] = f.name
  })
  // 别名只补充不覆盖，避免口语词抢掉标准名
  Object.keys(fooddb.ALIAS).forEach(k => {
    if (!map[k]) map[k] = fooddb.ALIAS[k]
  })
  return Object.keys(map)
    .map(k => ({ k, target: map[k] }))
    .sort((a, b) => b.k.length - a.k.length)
})()

/** 全角转半角，换行转逗号 */
function normalize(s) {
  return String(s || '')
    .replace(/\r?\n/g, '，')
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 65248))
    .replace(/[＋]/g, '+')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 扫描出所有食物命中（最长匹配，不重叠）
 * @returns {Array<{start:number,end:number,target:string,match:string}>}
 */
function locate(text) {
  const hits = []
  let i = 0
  while (i < text.length) {
    let found = null
    for (let j = 0; j < LEXICON.length; j++) {
      const item = LEXICON[j]
      if (text.startsWith(item.k, i)) {
        found = item
        break
      }
    }
    if (found) {
      hits.push({ start: i, end: i + found.k.length, target: found.target, match: found.k })
      i += found.k.length
    } else {
      i++
    }
  }
  return hits
}

/** 找出文本里所有的份量表达（「两碗」和「150克」都算） */
function findNumbers(text) {
  const out = []

  // 先找直接给重量的：「150克」「300ml」
  WEIGHT_RE.lastIndex = 0
  let w
  while ((w = WEIGHT_RE.exec(text)) !== null) {
    const n = Number(w[1])
    if (n > 0 && n <= 3000) {
      out.push({
        start: w.index,
        end: w.index + w[0].length,
        num: n,
        unit: w[2],
        type: 'weight'
      })
    }
  }

  // 再找「数量 + 量词」，跳过与上面重叠的
  NUMBER_RE.lastIndex = 0
  let m
  while ((m = NUMBER_RE.exec(text)) !== null) {
    const s = m.index
    const e = m.index + m[0].length
    if (out.some(x => s < x.end && e > x.start)) {
      if (m.index === NUMBER_RE.lastIndex) NUMBER_RE.lastIndex++
      continue
    }
    const raw = m[1]
    const n = CN_NUM[raw] != null ? CN_NUM[raw] : Number(raw)
    out.push({
      start: s,
      end: e,
      num: n > 0 && n <= 20 ? n : 1,
      unit: m[2],
      type: 'count'
    })
    if (m.index === NUMBER_RE.lastIndex) NUMBER_RE.lastIndex++
  }

  return out.sort((a, b) => a.start - b.start)
}

/** 从份量说明里读出总个数："10 个"→10、"两片"→2、"三颗"→3 */
function portionCount(portion) {
  const m = String(portion || '').match(
    new RegExp(`([0-9]+|[一二两三四五六七八九十半])\\s*(${PIECE_UNITS.join('|')})`)
  )
  if (!m) return 1
  const n = CN_NUM[m[1]] != null ? CN_NUM[m[1]] : Number(m[1])
  return n > 0 ? n : 1
}

/* ---------------- 主流程 ---------------- */

/**
 * @param {string} raw 用户输入的整段文字
 * @returns {{items: Array, unmatched: string[], raw: string}}
 */
function parse(raw) {
  const text = normalize(raw)
  if (!text) return { items: [], unmatched: [], raw: '' }

  const hits = locate(text)
  if (!hits.length) return { items: [], unmatched: [text], raw: text }

  const numbers = findNumbers(text)
  const usedNum = {}

  const items = []
  hits.forEach((h, idx) => {
    const prevEnd = idx === 0 ? 0 : hits[idx - 1].end
    const nextStart = idx === hits.length - 1 ? text.length : hits[idx + 1].start

    // 先看食物前面（"一碗米饭"），没有再往后找（"烧烤五串"）
    let pick = -1
    for (let n = numbers.length - 1; n >= 0; n--) {
      const x = numbers[n]
      if (usedNum[n]) continue
      if (x.start >= prevEnd && x.end <= h.start) {
        pick = n
        break
      }
    }
    if (pick === -1) {
      for (let n = 0; n < numbers.length; n++) {
        const x = numbers[n]
        if (usedNum[n]) continue
        // 往后认领必须紧贴，否则「粥和一根油条」会把「一根」算到粥头上
        if (x.start === h.end && x.end <= nextStart) {
          pick = n
          break
        }
      }
    }

    let count = 1
    let unit = ''
    let weightGram = 0
    if (pick > -1) {
      usedNum[pick] = true
      const info = numbers[pick]
      if (info.type === 'weight') {
        weightGram = info.num
        unit = info.unit
      } else {
        count = info.num
        unit = info.unit
      }
    }

    const food = fooddb.findByName(h.target)
    if (!food) return

    // 个数类的量词要折算单个重量："三个饺子"不是三份饺子
    let gram
    if (weightGram) {
      gram = weightGram
    } else {
      gram = food.defaultGram * count
      if (PIECE_UNITS.indexOf(unit) > -1) {
        const per = portionCount(food.portion)
        if (per > 0) gram = (food.defaultGram / per) * count
      }
    }
    gram = Math.max(5, Math.round(gram))

    const nut = fooddb.nutrientOf(food, gram)
    items.push({
      key: 't_' + food.id + '_' + Math.random().toString(36).slice(2, 6),
      name: food.name,
      gram,
      kcal: nut.kcal,
      carb: nut.carb,
      pro: nut.pro,
      fat: nut.fat,
      conf: weightGram ? 0.7 : 0.55,
      note: weightGram ? `${weightGram}${unit}` : count !== 1 || unit ? `${count}${unit || '份'}` : ''
    })
  })

  // 没被认成食物的文字，留给页面提示用户补
  const unmatched = []
  let cursor = 0
  hits.forEach(h => {
    if (h.start > cursor) unmatched.push(text.slice(cursor, h.start))
    cursor = h.end
  })
  if (cursor < text.length) unmatched.push(text.slice(cursor))

  const leftover = unmatched
    .map(s =>
      s
        .replace(WEIGHT_RE, '')
        .replace(NUMBER_RE, '')
        .replace(NOISE_RE, '')
        .replace(/[，,、+＋/；;：:。\s]/g, '')
    )
    .filter(s => s.length >= 2)

  return { items, unmatched: leftover, raw: text }
}

module.exports = { parse, locate }
