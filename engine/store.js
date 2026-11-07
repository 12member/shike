/**
 * 本地数据层：档案 + 每日餐食记录
 * 全部落在浏览器 localStorage，无网络也能用；后续要同步云端只改这一层即可。
 * storage 对象由打包脚本注入（get / set / remove 三个方法）。
 */

const KEY_PROFILE = 'sk_profile_v1'
const KEY_RECORDS = 'sk_records_v1'
const KEY_EXERCISE = 'sk_exercise_v1'
const KEEP_DAYS = 90 // 只保留最近 90 天，避免本地存储无限增长

const MEAL_TYPES = [
  { key: 'breakfast', label: '早餐', hour: [5, 10] },
  { key: 'lunch', label: '午餐', hour: [10, 15] },
  { key: 'dinner', label: '晚餐', hour: [15, 21] },
  { key: 'snack', label: '加餐', hour: [21, 29] }
]

/* ---------------- 日期工具 ---------------- */

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function dateKey(d) {
  const t = d || new Date()
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
}

function shiftDay(key, delta) {
  const [y, m, d] = key.split('-').map(Number)
  const t = new Date(y, m - 1, d)
  t.setDate(t.getDate() + delta)
  return dateKey(t)
}

function weekdayCN(key) {
  const [y, m, d] = key.split('-').map(Number)
  const t = new Date(y, m - 1, d)
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][t.getDay()]
}

function shortDate(key) {
  const [, m, d] = key.split('-').map(Number)
  return `${m}/${d}`
}

function nowTimeText() {
  const t = new Date()
  return `${pad(t.getHours())}:${pad(t.getMinutes())}`
}

/** 按当前时间猜餐次，方便拍照时默认选中 */
function guessMealType() {
  const h = new Date().getHours()
  if (h >= 5 && h < 10) return 'breakfast'
  if (h >= 10 && h < 15) return 'lunch'
  if (h >= 15 && h < 21) return 'dinner'
  return 'snack'
}

/* ---------------- 档案 ---------------- */

function getProfile() {
  try {
    return storage.get(KEY_PROFILE) || null
  } catch (e) {
    return null
  }
}

function saveProfile(p) {
  try {
    storage.set(KEY_PROFILE, p)
    return true
  } catch (e) {
    return false
  }
}

function hasProfile() {
  const p = getProfile()
  return !!(p && p.height && p.weight && p.age)
}

/* ---------------- 餐食记录 ---------------- */

function getAllRecords() {
  try {
    return storage.get(KEY_RECORDS) || {}
  } catch (e) {
    return {}
  }
}

function saveAllRecords(all) {
  // 清理过期数据
  const keys = Object.keys(all).sort()
  while (keys.length > KEEP_DAYS) {
    delete all[keys.shift()]
  }
  try {
    storage.set(KEY_RECORDS, all)
    return true
  } catch (e) {
    console.error('写入记录失败', e)
    return false
  }
}

function getDay(key) {
  const all = getAllRecords()
  return all[key || dateKey()] || []
}

function addMeal(meal, dayKey) {
  const k = dayKey || dateKey()
  const all = getAllRecords()
  if (!all[k]) all[k] = []
  all[k].push(meal)
  all[k].sort((a, b) => a.ts - b.ts)
  saveAllRecords(all)
  return all[k]
}

function removeMeal(mealId, dayKey) {
  const k = dayKey || dateKey()
  const all = getAllRecords()
  if (!all[k]) return []
  all[k] = all[k].filter(m => m.id !== mealId)
  if (!all[k].length) delete all[k]
  saveAllRecords(all)
  return all[k] || []
}

function updateMeal(mealId, patch, dayKey) {
  const k = dayKey || dateKey()
  const all = getAllRecords()
  if (!all[k]) return []
  all[k] = all[k].map(m => (m.id === mealId ? Object.assign({}, m, patch) : m))
  saveAllRecords(all)
  return all[k]
}

/** 近 n 天（含今天）按日期倒序 */
function getRecentDays(n) {
  const all = getAllRecords()
  const out = []
  let cursor = dateKey()
  for (let i = 0; i < n; i++) {
    const meals = all[cursor] || []
    if (meals.length) out.push({ date: cursor, meals })
    cursor = shiftDay(cursor, -1)
  }
  return out
}

/** 近 n 天热量序列（含无记录的 0），用于趋势图 */
function getKcalSeries(n) {
  const all = getAllRecords()
  const out = []
  let cursor = dateKey()
  for (let i = 0; i < n; i++) {
    const meals = all[cursor] || []
    let kcal = 0
    meals.forEach(m => (m.items || []).forEach(it => (kcal += Number(it.kcal) || 0)))
    out.unshift({ date: cursor, kcal: Math.round(kcal) })
    cursor = shiftDay(cursor, -1)
  }
  return out
}

function clearAll() {
  try {
    storage.remove(KEY_RECORDS)
    storage.remove(KEY_EXERCISE)
    return true
  } catch (e) {
    return false
  }
}

/** 只删档案，保留记录 */
function clearProfile() {
  try {
    storage.remove(KEY_PROFILE)
    return true
  } catch (e) {
    return false
  }
}

/* ---------------- 运动记录 ---------------- */

function getAllExercise() {
  try {
    return storage.get(KEY_EXERCISE) || {}
  } catch (e) {
    return {}
  }
}

function saveAllExercise(all) {
  const keys = Object.keys(all).sort()
  while (keys.length > KEEP_DAYS) {
    delete all[keys.shift()]
  }
  try {
    storage.set(KEY_EXERCISE, all)
    return true
  } catch (e) {
    console.error('写入运动记录失败', e)
    return false
  }
}

function getDayExercise(dayKey) {
  const all = getAllExercise()
  return all[dayKey || dateKey()] || []
}

function addExercise(item, dayKey) {
  const k = dayKey || dateKey()
  const all = getAllExercise()
  if (!all[k]) all[k] = []
  all[k].push(item)
  all[k].sort((a, b) => a.ts - b.ts)
  saveAllExercise(all)
  return all[k]
}

function removeExercise(id, dayKey) {
  const k = dayKey || dateKey()
  const all = getAllExercise()
  if (!all[k]) return []
  all[k] = all[k].filter(e => e.id !== id)
  if (!all[k].length) delete all[k]
  saveAllExercise(all)
  return all[k] || []
}

/** 近 n 天运动消耗序列 */
function getExerciseSeries(n) {
  const all = getAllExercise()
  const out = []
  let cursor = dateKey()
  for (let i = 0; i < n; i++) {
    const list = all[cursor] || []
    const kcal = list.reduce((s, e) => s + (Number(e.kcal) || 0), 0)
    out.unshift({ date: cursor, kcal: Math.round(kcal), count: list.length })
    cursor = shiftDay(cursor, -1)
  }
  return out
}

/** 生成简单唯一 id */
function uid() {
  return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

module.exports = {
  MEAL_TYPES,
  dateKey,
  shiftDay,
  weekdayCN,
  shortDate,
  nowTimeText,
  guessMealType,
  getProfile,
  saveProfile,
  hasProfile,
  getAllRecords,
  getDay,
  addMeal,
  removeMeal,
  updateMeal,
  getRecentDays,
  getKcalSeries,
  getAllExercise,
  getDayExercise,
  addExercise,
  removeExercise,
  getExerciseSeries,
  clearAll,
  clearProfile,
  uid
}
