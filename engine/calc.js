/**
 * 营养与代谢计算引擎
 *
 * 计算口径（不可随意改动）：
 *  - BMI 分级：中国成人标准 WS/T 428-2013（<18.5 偏瘦 / 18.5~23.9 正常 / 24~27.9 超重 / ≥28 肥胖）
 *  - BMR：Mifflin-St Jeor 公式
 *      男：10×体重kg + 6.25×身高cm − 5×年龄 + 5
 *      女：10×体重kg + 6.25×身高cm − 5×年龄 − 161
 *  - TDEE：BMR × 活动系数
 *  - 每日热量下限：女性 1200 kcal / 男性 1500 kcal（低于此线需专业指导）
 *
 * 可信度标注：本文件所有输出为 [COMPUTED]，依赖用户填写的真实身高体重。
 */

const ACTIVITY = {
  sedentary: { factor: 1.2, label: '久坐', desc: '几乎不运动，办公室为主' },
  light: { factor: 1.375, label: '轻度', desc: '每周运动 1~3 次' },
  moderate: { factor: 1.55, label: '中度', desc: '每周运动 3~5 次' },
  high: { factor: 1.725, label: '高强度', desc: '每周运动 6~7 次' },
  veryhigh: { factor: 1.9, label: '极高', desc: '体力劳动或每天两练' }
}

const GOALS = {
  lose: { label: '减脂', delta: -400, proPerKg: 1.6, tip: '制造温和热量缺口，保肌肉减脂肪' },
  maintain: { label: '维持', delta: 0, proPerKg: 1.2, tip: '吃得和消耗持平，稳住体重' },
  gain: { label: '增重', delta: 300, proPerKg: 1.6, tip: '小幅热量盈余，长体重不猛长脂肪' },
  muscle: { label: '增肌', delta: 300, proPerKg: 1.8, tip: '热量小幅盈余 + 高蛋白 + 力量训练' }
}

/** 中国成人 BMI 分级 */
function bmiLevel(bmi) {
  if (bmi < 18.5) {
    return { key: 'thin', label: '偏瘦', color: '#3D8BFD', tip: '体重偏低，优先增重或增肌' }
  }
  if (bmi < 24) {
    return { key: 'normal', label: '正常', color: '#17A673', tip: '体重在健康区间，注意体型和体脂' }
  }
  if (bmi < 28) {
    return { key: 'over', label: '超重', color: '#F5A623', tip: '建议温和减脂，先降 5% 体重' }
  }
  return { key: 'obese', label: '肥胖', color: '#FF7A6B', tip: '建议就医评估后在指导下减重' }
}

/** 计算基础代谢，返回数值与可展示的计算过程 */
function calcBMR(gender, weight, height, age) {
  const base = 10 * weight + 6.25 * height - 5 * age
  const adjust = gender === 'male' ? 5 : -161
  const bmr = base + adjust
  const steps = [
    `10 × ${weight}kg = ${10 * weight}`,
    `6.25 × ${height}cm = ${(6.25 * height).toFixed(1)}`,
    `5 × ${age}岁 = ${5 * age}`,
    `${gender === 'male' ? '+ 5' : '− 161'}（${gender === 'male' ? '男' : '女'}）`,
    `合计 BMR ≈ ${Math.round(bmr)} kcal`
  ]
  return { bmr: Math.round(bmr), steps }
}

/**
 * 生成完整的个性化方案
 * @param {object} p { gender, age, height, weight, activity, goal }
 */
function computePlan(p) {
  if (!p || !p.height || !p.weight || !p.age) return null

  const gender = p.gender || 'female'
  const age = Number(p.age)
  const height = Number(p.height)
  const weight = Number(p.weight)
  const activityKey = ACTIVITY[p.activity] ? p.activity : 'light'
  const goalKey = GOALS[p.goal] ? p.goal : 'maintain'
  const act = ACTIVITY[activityKey]
  const goal = GOALS[goalKey]

  // ---- BMI ----
  const bmi = +(weight / Math.pow(height / 100, 2)).toFixed(1)
  const level = bmiLevel(bmi)

  // ---- BMR / TDEE ----
  const { bmr, steps } = calcBMR(gender, weight, height, age)
  const tdee = Math.round(bmr * act.factor)

  // ---- 目标热量 ----
  let kcalTarget = Math.round(tdee + goal.delta)
  const floor = gender === 'male' ? 1500 : 1200
  let floorApplied = false
  if (goal.delta < 0 && kcalTarget < floor) {
    kcalTarget = floor
    floorApplied = true
  }

  // ---- 宏量营养素 ----
  const proG = Math.round(weight * goal.proPerKg)
  const fatG = Math.round((kcalTarget * 0.27) / 9)
  let carbG = Math.round((kcalTarget - proG * 4 - fatG * 9) / 4)
  if (carbG < 0) carbG = 0

  const carbKcal = carbG * 4
  const proKcal = proG * 4
  const fatKcal = fatG * 9
  const totalKcal = carbKcal + proKcal + fatKcal || 1

  const macros = {
    carb: { g: carbG, kcal: carbKcal, pct: Math.round((carbKcal / totalKcal) * 100) },
    pro: { g: proG, kcal: proKcal, pct: Math.round((proKcal / totalKcal) * 100) },
    fat: { g: fatG, kcal: fatKcal, pct: Math.round((fatKcal / totalKcal) * 100) }
  }

  // ---- 健康体重区间 ----
  const h = height / 100
  const weightRange = {
    min: +(18.5 * h * h).toFixed(1),
    max: +(23.9 * h * h).toFixed(1)
  }

  // ---- 目标方向建议（不是用户选什么就做什么，要看 BMI 合不合适）----
  const warn = []
  let goalSuggestion = null

  if (level.key === 'thin' && (goalKey === 'lose')) {
    goalSuggestion = {
      level: 'danger',
      text: `你现在 BMI ${bmi}，已经偏瘦了。这个体重再减会掉肌肉、影响免疫和内分泌。建议改成「增肌」或「维持」，先把体重拉到 ${weightRange.min}kg 以上。`
    }
  } else if (level.key === 'thin' && goalKey === 'maintain') {
    goalSuggestion = {
      level: 'warn',
      text: `BMI ${bmi} 偏瘦，维持目标下建议把蛋白质和总热量都提一点，目标体重 ${weightRange.min}~${weightRange.max}kg。`
    }
  } else if (level.key === 'over' && goalKey === 'muscle') {
    goalSuggestion = {
      level: 'warn',
      text: `BMI ${bmi} 属于超重，直接增肌容易热量盈余过多。建议先减脂到 ${weightRange.max}kg 以内，再转增肌。`
    }
  } else if (level.key === 'obese' && goalKey !== 'lose') {
    goalSuggestion = {
      level: 'warn',
      text: `BMI ${bmi} 达到肥胖标准，建议以减脂为当前目标，并把减重节奏控制在每周 0.5~1kg。如果有血压、血糖、血脂异常，先找医生评估。`
    }
  }

  if (floorApplied) {
    warn.push(`按基础代谢算出的目标低于安全下限，已自动上调到 ${floor} kcal。再低就需要在医生或注册营养师指导下进行。`)
  }

  // ---- 预期速度 ----
  const weeklyDelta = goalKey === 'lose' ? -0.5 : goalKey === 'maintain' ? 0 : 0.3

  return {
    bmi,
    level,
    bmr,
    bmrSteps: steps,
    tdee,
    activity: { key: activityKey, label: act.label, factor: act.factor, desc: act.desc },
    goal: { key: goalKey, label: goal.label, tip: goal.tip },
    kcalTarget,
    kcalFloor: floor,
    floorApplied,
    macros,
    weightRange,
    goalSuggestion,
    warnings: warn,
    weeklyDelta,
    // 一句话总结，给首页用
    summary: buildSummary(gender, bmi, level, kcalTarget, goal, goalKey)
  }
}

function buildSummary(gender, bmi, level, kcalTarget, goal, goalKey) {
  if (goalKey === 'lose') {
    return `每天吃 ${kcalTarget} 大卡左右，每周稳掉 0.5kg 上下，比一次砍太狠更容易坚持。`
  }
  if (goalKey === 'muscle') {
    return `每天 ${kcalTarget} 大卡，蛋白质吃够、力量训练跟上，涨的主要才是肌肉。`
  }
  if (goalKey === 'gain') {
    return `每天 ${kcalTarget} 大卡，少量盈余慢慢长，别指望一周涨两斤。`
  }
  return `每天 ${kcalTarget} 大卡左右维持现状，重点是把蛋白质和三餐节奏吃稳。`
}

/** 统计一组记录的营养合计 */
function sumMeals(meals) {
  const total = { kcal: 0, carb: 0, pro: 0, fat: 0 }
  ;(meals || []).forEach(m => {
    ;(m.items || []).forEach(it => {
      total.kcal += Number(it.kcal) || 0
      total.carb += Number(it.carb) || 0
      total.pro += Number(it.pro) || 0
      total.fat += Number(it.fat) || 0
    })
  })
  total.kcal = Math.round(total.kcal)
  total.carb = +total.carb.toFixed(1)
  total.pro = +total.pro.toFixed(1)
  total.fat = +total.fat.toFixed(1)
  return total
}

/** 归一化一组食物项（识别结果或手动选择），补齐营养字段 */
function normalizeItems(items) {
  return (items || []).map(it => {
    const gram = Math.max(0, Math.round(Number(it.gram) || 0))
    const kcal = Math.round(Number(it.kcal) || 0)
    const carb = +(Number(it.carb) || 0).toFixed(1)
    const pro = +(Number(it.pro) || 0).toFixed(1)
    const fat = +(Number(it.fat) || 0).toFixed(1)
    return {
      name: it.name || '未命名食物',
      gram,
      kcal,
      carb,
      pro,
      fat,
      conf: it.conf == null ? null : Number(it.conf),
      note: it.note || ''
    }
  })
}

module.exports = {
  ACTIVITY,
  GOALS,
  bmiLevel,
  calcBMR,
  computePlan,
  sumMeals,
  normalizeItems
}
