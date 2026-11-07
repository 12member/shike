/**
 * 营养诊断与补餐建议引擎
 *
 * 输入：当日合计 + 个人方案 + 已记录的餐次
 * 输出：缺口量化 + 最多 3 条可执行建议（建议里的食物可直接一键加入记录）
 *
 * 判定依据：《中国居民膳食指南（2022）》
 *   碳水供能比 50%~65%，蛋白质 10%~15%，脂肪 20%~30%
 *   蔬菜 300~500g/天
 */

const fooddb = require('./fooddb')

function pct(a, b) {
  if (!b) return 0
  return Math.round((a / b) * 100)
}

/** 找到某个食物名的分类（识别结果没有分类字段，用库反查） */
function catOf(name) {
  const f = fooddb.findByName(name)
  return f ? f.cat : 'other'
}

/** 贪心挑食物补某个营养素，返回可直接加入记录的建议项 */
function pickFoods(names, need, key) {
  const out = []
  let left = need
  if (left <= 0) return out
  names.forEach(n => {
    if (left <= 0) return
    const f = fooddb.findByName(n)
    if (!f) return
    const per = f.per100[key]
    if (!per) return
    // 按默认份量取，超过缺口太多就少给一点（按 50g 取整）
    let gram = f.defaultGram
    const gainAtDefault = (per * gram) / 100
    if (gainAtDefault > left * 1.8) {
      gram = Math.max(50, Math.round((left / per) * 100 / 50) * 50)
    }
    const gain = +((per * gram) / 100).toFixed(1)
    out.push({
      name: f.name,
      gram,
      gain,
      kcal: Math.round((f.per100.kcal * gram) / 100),
      unit: f.portion
    })
    left -= gain
  })
  return out
}

/**
 * @param {object} opts
 * @param {object} opts.plan     computePlan 结果，可为 null（未建档）
 * @param {object} opts.totals   当日饮食合计 { kcal, carb, pro, fat }
 * @param {array}  opts.meals    当日饮食记录数组
 * @param {object} opts.exercise 当日运动 { kcal, kinds:{strength,cardio,ball,light}, count }
 * @param {string} opts.gender   未建档时用来取通用参考值
 */
function analyze(opts) {
  const totals = opts.totals || { kcal: 0, carb: 0, pro: 0, fat: 0 }
  const meals = opts.meals || []
  const plan = opts.plan
  const ex = opts.exercise || { kcal: 0, kinds: {}, count: 0 }
  const exKcal = Math.max(0, Number(ex.kcal) || 0)

  // 未建档时用膳食指南的轻体力参考值，并明确标注是通用值
  const fallback = (opts.gender || 'female') === 'male'
    ? { kcal: 2250, pro: 75, carb: 300, fat: 70 }
    : { kcal: 1800, pro: 60, carb: 240, fat: 55 }

  const target = plan
    ? {
        kcal: plan.kcalTarget,
        pro: plan.macros.pro.g,
        carb: plan.macros.carb.g,
        fat: plan.macros.fat.g
      }
    : fallback

  const remaining = {
    // 运动消耗计入预算：今天动了，就可以多吃这么多
    kcal: Math.round(target.kcal + exKcal - totals.kcal),
    carb: +(target.carb - totals.carb).toFixed(1),
    pro: +(target.pro - totals.pro).toFixed(1),
    fat: +(target.fat - totals.fat).toFixed(1)
  }

  // 实际供能占比
  const energy = totals.carb * 4 + totals.pro * 4 + totals.fat * 9
  const actualPct = energy
    ? {
        carb: Math.round((totals.carb * 4 * 100) / energy),
        pro: Math.round((totals.pro * 4 * 100) / energy),
        fat: Math.round((totals.fat * 9 * 100) / energy)
      }
    : { carb: 0, pro: 0, fat: 0 }

  // 蔬菜克数
  let vegGram = 0
  let vegKinds = 0
  const nameSet = {}
  meals.forEach(m =>
    (m.items || []).forEach(it => {
      nameSet[it.name] = true
      if (catOf(it.name) === 'veg') {
        vegGram += Number(it.gram) || 0
        vegKinds++
      }
    })
  )
  const foodKinds = Object.keys(nameSet).length

  const kcalPct = pct(totals.kcal, target.kcal)
  const eatenTypes = meals.map(m => m.type)
  const hasBreakfast = eatenTypes.indexOf('breakfast') > -1

  // 净摄入 = 吃进去的 - 运动消耗的。判断「超没超」要看净值，不然运动那天会误报。
  const netKcal = Math.round(totals.kcal - exKcal)
  const netOver = netKcal - target.kcal
  const strengthDay = !!(ex.kinds && ex.kinds.strength > 0)

  /* ---------------- 生成建议（最多 3 条） ---------------- */
  const tips = []

  // 1) 蛋白质缺口，优先级最高
  const proGap = target.pro - totals.pro
  if (totals.kcal > 300 && proGap > target.pro * 0.2) {
    const picks = pickFoods(fooddb.PROTEIN_PICKS, proGap, 'pro').slice(0, 3)
    const gain = Math.round(picks.reduce((s, p) => s + p.gain, 0))
    const comboText = picks.map(p => `${p.name} ${p.gram}g`).join(' + ')
    // 一次补不完很正常，剩下的交给下一餐，不要误导用户「补这一份就够了」
    const tail =
      gain < proGap * 0.8
        ? `剩下的 ${Math.round(proGap - gain)}g 交给下一餐的主菜，一份鱼或一块鸡腿就够。`
        : `蛋白质分散到三餐吸收更好，别一顿猛补。`
    tips.push({
      key: 'protein',
      level: proGap > target.pro * 0.4 ? 'high' : 'mid',
      title: strengthDay
        ? `今天蛋白质还差 ${Math.round(proGap)}g（练过更要补）`
        : `今天蛋白质还差 ${Math.round(proGap)}g`,
      body: strengthDay
        ? `今天有力量训练，蛋白质需求比平时高。这会儿先补：${comboText}，约 ${gain}g。${tail}`
        : `这会儿先补：${comboText}，约 ${gain}g。${tail}`,
      foods: picks
    })
  }

  // 2) 运动了但吃得不够：这种日子最容易掉肌肉
  if (exKcal >= 200 && totals.kcal > 0 && kcalPct < 65) {
    tips.push({
      key: 'ex_low',
      level: 'high',
      title: `今天动了 ${exKcal} 大卡，吃得偏少`,
      body: `有运动的日子吃太少，身体会拆肌肉供能，练了也白练。今天的目标可以加上这 ${exKcal} 大卡，优先吃蛋白质和主食，别只吃菜。`,
      foods: []
    })
  }

  // 3) 热量超预算（按净摄入算，运动那天不误伤）
  if (netOver > target.kcal * 0.05) {
    const over = Math.round(netOver)
    tips.push({
      key: 'kcal_over',
      level: over > 400 ? 'high' : 'mid',
      title: exKcal > 0 ? `净摄入超了 ${over} 大卡` : `今天超了 ${over} 大卡`,
      body:
        exKcal > 0
          ? `运动消耗的 ${exKcal} 大卡已经抵掉了，净摄入还是超 ${over}。别用运动当多吃的借口——消耗估算本身就有误差，吃回来的往往比练掉的准。今晚收一收。`
          : over > 400
          ? `超得有点多。今晚别再吃东西了，明早正常吃、别用断食补偿，多走 40 分钟把缺口找回来一点就行。`
          : `不算严重。下一餐把主食减三分之一、油少的菜多吃点，一天之内拉平没问题。`,
      foods: []
    })
  }

  // 4) 脂肪供能比过高（中餐最常见的问题）
  if (energy > 400 && actualPct.fat > 35) {
    tips.push({
      key: 'fat',
      level: 'mid',
      title: `脂肪占了 ${actualPct.fat}% 的热量，偏高`,
      body: `推荐是 20%~30%。看看是不是炒菜油多、或者有油炸/红烧的菜——下次同类菜换成蒸、煮、白灼，一天能省 200 大卡以上。`,
      foods: []
    })
  }

  // 5) 蔬菜不够
  if (vegGram < 200 && totals.kcal > 300) {
    const need = 300 - vegGram
    const picks = pickFoods(fooddb.VEG_PICKS, need, 'carb').slice(0, 2)
    tips.push({
      key: 'veg',
      level: 'mid',
      title: vegGram === 0 ? '今天还没吃蔬菜' : `蔬菜只有 ${Math.round(vegGram)}g，不够`,
      body: `一天建议 300~500g，深色蔬菜占一半。加一份${
        picks.length ? picks.map(p => p.name + ' ' + p.gram + 'g').join(' 或 ') : '白灼菜心 150g'
      }，热量低但饱腹感强。`,
      foods: picks
    })
  }

  // 6) 热量吃太少（有运动的情况上面已经单独处理，避免重复说）
  if (exKcal === 0 && kcalPct < 50 && (new Date().getHours() >= 19 || meals.length >= 3)) {
    tips.push({
      key: 'kcal_low',
      level: 'mid',
      title: '今天吃得太少了',
      body: `到现在才 ${totals.kcal} 大卡，不到目标的 ${kcalPct}%。长期吃不到基础代谢会掉肌肉、代谢变慢，晚上补一份正经的：主食一小碗 + 蛋白质一份 + 蔬菜一份。`,
      foods: []
    })
  }

  // 7) 碳水供能比过高
  if (energy > 500 && actualPct.carb > 65) {
    tips.push({
      key: 'carb',
      level: 'low',
      title: `碳水占了 ${actualPct.carb}%，偏多`,
      body: `主食和甜饮料吃多了。下一餐把一半白米饭换成杂粮饭或红薯，同样的量更抗饿、血糖也更稳。`,
      foods: []
    })
  }

  // 8) 早餐缺失
  if (!hasBreakfast && new Date().getHours() >= 11 && meals.length > 0) {
    tips.push({
      key: 'breakfast',
      level: 'low',
      title: '今天没记早餐',
      body: `不吃早餐的人更容易在晚上报复性进食。明早花 5 分钟：一个鸡蛋 + 一杯牛奶 + 一片全麦面包，就够撑到中午。`,
      foods: []
    })
  }

  // 9) 食物种类太少
  if (foodKinds > 0 && foodKinds < 4 && totals.kcal > 800) {
    tips.push({
      key: 'variety',
      level: 'low',
      title: '吃的种类偏单一',
      body: `一天建议 12 种以上食物。主食换着来、加一份深色蔬菜、再来点水果或坚果，微量元素才补得全。`,
      foods: []
    })
  }

  // 排序：高优先在前，取前 3 条
  const order = { high: 0, mid: 1, low: 2 }
  tips.sort((a, b) => order[a.level] - order[b.level])
  const topTips = tips.slice(0, 3)

  // 一句总评
  let coachLine
  if (!meals.length && exKcal > 0) {
    coachLine = `今天动了 ${exKcal} 大卡，但还没记吃的。练完该补的别忘了记，不然看不出效果。`
  } else if (!meals.length) {
    coachLine = '今天还没记录。拍一张或者说一句吃了什么，先看清自己吃了什么，比什么计划都管用。'
  } else if (exKcal >= 200 && kcalPct < 65) {
    coachLine = `今天动了 ${exKcal} 大卡，才吃了目标的 ${kcalPct}%。有运动的日子别吃这么少。`
  } else if (kcalPct <= 105 && proGap <= target.pro * 0.2 && vegGram >= 200) {
    coachLine = exKcal > 0
      ? `今天动了 ${exKcal} 大卡，热量和蛋白也在线，这个节奏最好保持。`
      : '今天这节奏不错，热量、蛋白、蔬菜都在线，继续保持。'
  } else if (netOver > target.kcal * 0.05) {
    coachLine = `净摄入超了 ${Math.round(netOver)} 大卡，收一收，明天正常吃就行。`
  } else if (kcalPct < 50) {
    coachLine = `才吃了目标的 ${kcalPct}%，别硬扛，下一餐正常吃。`
  } else {
    coachLine = `热量还剩 ${remaining.kcal} 大卡，把蛋白质和蔬菜补齐就挺好。`
  }

  return {
    target,
    remaining,
    kcalPct,
    actualPct,
    netKcal,
    netOver: Math.round(netOver),
    exerciseKcal: exKcal,
    exerciseCount: ex.count || 0,
    proGap: +proGap.toFixed(1),
    vegGram: Math.round(vegGram),
    foodKinds,
    tips: topTips,
    coachLine,
    isFallback: !plan
  }
}

module.exports = { analyze, pickFoods }
