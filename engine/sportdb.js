/**
 * 运动库与消耗计算
 *
 * 消耗公式：kcal = MET × 体重(kg) × 小时数
 * MET（代谢当量）参考 Compendium of Physical Activities 的常见活动强度值。
 * 这是国际通用的估算方法，误差约 ±15%~25%（和实际强度、动作效率、体成分有关）。
 *
 * 注意：手环/手表显示的消耗往往偏高，同样一次半场篮球，表上可能给你 400，
 * 按 MET 算大概 200~250。这里一律按公式算，不取高值。
 */

const CATS = ['球类', '跑步', '骑行', '游泳', '健身房', '其他']

const RAW = [
  // 名称, MET, 分类
  ['篮球（半场）', 6.5, '球类'],
  ['篮球（全场）', 8.0, '球类'],
  ['羽毛球', 5.5, '球类'],
  ['乒乓球', 4.0, '球类'],
  ['足球', 7.0, '球类'],
  ['网球', 7.3, '球类'],
  ['排球', 4.0, '球类'],
  ['台球 / 保龄球', 2.5, '球类'],

  ['散步（4km/h）', 3.0, '跑步'],
  ['快走（5.6km/h）', 4.3, '跑步'],
  ['慢跑（8km/h）', 8.3, '跑步'],
  ['跑步（10km/h）', 9.8, '跑步'],
  ['跑走结合', 6.0, '跑步'],

  ['骑行（休闲）', 6.8, '骑行'],
  ['骑行（快速）', 10.0, '骑行'],
  ['动感单车', 8.5, '骑行'],

  ['游泳（慢速）', 6.0, '游泳'],
  ['游泳（中等）', 8.3, '游泳'],
  ['游泳（快速）', 10.0, '游泳'],

  ['力量训练（中等）', 3.5, '健身房'],
  ['力量训练（大重量）', 6.0, '健身房'],
  ['椭圆机', 5.0, '健身房'],
  ['划船机', 7.0, '健身房'],
  ['HIIT / 搏击操', 8.0, '健身房'],
  ['跳绳', 11.0, '健身房'],

  ['瑜伽', 2.5, '其他'],
  ['普拉提', 3.0, '其他'],
  ['跳舞', 5.0, '其他'],
  ['爬山 / 徒步', 6.0, '其他'],
  ['爬楼梯', 8.8, '其他'],
  ['做家务（打扫）', 3.3, '其他'],
  ['拉伸 / 放松', 2.3, '其他']
]

const SPORTS = RAW.map((r, i) => ({
  id: 's' + i,
  name: r[0],
  met: r[1],
  cat: r[2],
  // 归类，决定运动后补什么
  kind: classify(r[0], r[1])
}))

function classify(name, met) {
  // 注意：这里不能用「跑步」匹配，很多条目叫「慢跑」「跑走结合」
  if (/力量|HIIT/.test(name)) return 'strength'
  if (/游泳|跑|骑行|椭圆|动感单车|跳绳|爬山|徒步|爬楼梯|划船/.test(name)) return 'cardio'
  if (/篮球|足球|羽毛球|网球|排球|乒乓球/.test(name)) return 'ball'
  return 'light'
}

/** 运动后推荐的食物池 */
const PRO_FOODS = ['鸡蛋（煮）', '鸡胸肉（煮）', '无糖酸奶', '全脂牛奶']
const CARB_FOODS = ['香蕉', '白米饭', '全麦面包', '蒸红薯']

/** 默认体重，用于未建档用户（会明确标注为估算） */
const DEFAULT_WEIGHT = 60

/**
 * 估算消耗
 * @returns {{kcal:number, usedWeight:number, isDefaultWeight:boolean}}
 */
function burn(met, minutes, weight) {
  const w = Number(weight) > 30 ? Number(weight) : DEFAULT_WEIGHT
  const h = Math.max(1, Number(minutes) || 0) / 60
  return {
    kcal: Math.round(met * w * h),
    usedWeight: w,
    isDefaultWeight: !(Number(weight) > 30)
  }
}

function listByCat(cat) {
  return SPORTS.filter(s => s.cat === cat)
}

function findByName(name) {
  if (!name) return null
  return SPORTS.find(s => s.name === name) || SPORTS.find(s => s.name.indexOf(name) > -1) || null
}

/**
 * 运动后的膳食补充建议
 * 依据：运动后补充碳水+蛋白有助于恢复，强度越高、时间越长，需要补的越多。
 * 只给天然食物，不涉及任何补剂产品。
 */
function recoveryTip(kind, minutes, burnKcal, weight) {
  const w = Number(weight) > 30 ? Number(weight) : DEFAULT_WEIGHT
  const long = minutes >= 60

  if (kind === 'light' || minutes < 20) {
    return {
      title: '这次不用特意加餐',
      body: '强度不高、时间也短，正常吃下一餐就行。记得喝水。',
      need: null,
      foods: []
    }
  }

  if (kind === 'strength') {
    const pro = Math.round(w * (long ? 0.35 : 0.28))
    const carb = Math.round(w * (long ? 0.9 : 0.6))
    return {
      title: `补 ${pro}g 蛋白 + ${carb}g 碳水`,
      body: `力量训练后肌肉在修，这时候补蛋白效率最高。${
        long ? '练得久，碳水也要跟上，别只喝蛋白。' : '碳水别省，它帮蛋白进肌肉。'
      }练完 1 小时内吃完就行，不用赶那 30 分钟。`,
      need: { pro, carb },
      foods: pick(PRO_FOODS, pro, 'pro').concat(pick(CARB_FOODS, carb, 'carb'))
    }
  }

  if (kind === 'cardio') {
    const carb = Math.round(w * (long ? 1.0 : 0.6))
    const pro = Math.round(w * 0.2)
    return {
      title: `补 ${carb}g 碳水 + ${pro}g 蛋白`,
      body: `长时间有氧把糖原消耗得比较多，主食要补回来，不然下一次练不动。${
        long ? '出汗多的话，水和盐一起补。' : ''
      }`,
      need: { pro, carb },
      foods: pick(CARB_FOODS, carb, 'carb').concat(pick(PRO_FOODS, pro, 'pro'))
    }
  }

  // 球类
  const carb = Math.round(w * (long ? 0.8 : 0.5))
  const pro = Math.round(w * 0.22)
  return {
    title: `补 ${carb}g 碳水 + ${pro}g 蛋白`,
    body: `打球是间歇性的，糖原掉得快。补点主食加一份蛋白，比只喝水恢复得快。${
      long ? '打了这么久，下一餐正常吃，不用刻意省。' : ''
    }`,
    need: { pro, carb },
    foods: pick(CARB_FOODS, carb, 'carb').concat(pick(PRO_FOODS, pro, 'pro'))
  }
}

/** 从候选里挑一份最贴合缺口的食物，key 指定按哪个营养素算 */
function pick(names, needGram, key) {
  const fooddb = require('./fooddb')
  const cands = []
  names.forEach(n => {
    const f = fooddb.findByName(n)
    if (!f) return
    const per = f.per100[key] || 0
    if (per > 0) cands.push({ f, per })
  })
  if (!cands.length || needGram <= 0) return []

  const make = (c, gram) => {
    const gain = +((c.per * gram) / 100).toFixed(1)
    return {
      name: c.f.name,
      gram,
      gain,
      kcal: Math.round((c.f.per100.kcal * gram) / 100)
    }
  }

  // 优先选「默认份量正好落在缺口 60%~180% 区间」的那一个，避免给一堆零碎小份
  const best = cands.find(c => {
    const gain = (c.per * c.f.defaultGram) / 100
    return gain >= needGram * 0.6 && gain <= needGram * 1.8
  })
  if (best) return [make(best, best.f.defaultGram)]

  // 没有刚好合适的，按默认份量累加，最多两样
  const out = []
  let left = needGram
  for (const c of cands) {
    if (left <= 0 || out.length >= 2) break
    let gram = c.f.defaultGram
    if ((c.per * gram) / 100 > left * 2) {
      gram = Math.max(50, Math.round(((left / c.per) * 100) / 50) * 50)
    }
    out.push(make(c, gram))
    left -= (c.per * gram) / 100
  }
  return out
}

/** 今天运动类型汇总，给建议引擎用 */
function summarize(list) {
  const arr = list || []
  let kcal = 0
  const kinds = {}
  arr.forEach(e => {
    kcal += Number(e.kcal) || 0
    kinds[e.kind] = (kinds[e.kind] || 0) + (Number(e.minutes) || 0)
  })
  return { kcal: Math.round(kcal), kinds, count: arr.length }
}

module.exports = {
  CATS,
  SPORTS,
  DEFAULT_WEIGHT,
  burn,
  listByCat,
  findByName,
  recoveryTip,
  summarize
}
