/* 最小 DOM 冒烟测试：把 app.js 的每条渲染路径和主要交互都跑一遍 */

const fs = require('fs')
const path = require('path')
const ROOT = 'D:/the  packet of software/WorkBuddy/2026-10-17-11-28-56/shike-web'

/* ---------- 假 DOM ---------- */

const handlers = {}
const els = {}

function makeEl(id) {
  const el = {
    id: id || '',
    _html: '',
    textContent: '',
    value: '',
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    getAttribute() { return null },
    setAttribute() {},
    addEventListener() {},
    focus() {},
    querySelector() { return null },
    querySelectorAll() { return [] },
    closest() { return null },
    appendChild() {},
    getContext() { return { drawImage() {} } },
    toDataURL() { return 'data:image/jpeg;base64,AA' }
  }
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html },
    set(v) { el._html = String(v) }
  })
  return el
}

global.document = {
  getElementById(id) { if (!els[id]) els[id] = makeEl(id); return els[id] },
  querySelector() { return null },
  querySelectorAll() { return [] },
  createElement(tag) { return makeEl('new-' + tag) },
  addEventListener(type, fn) { (handlers[type] = handlers[type] || []).push(fn) }
}

const LSI = {}
global.localStorage = {
  getItem: k => (k in LSI ? LSI[k] : null),
  setItem: (k, v) => { LSI[k] = String(v) },
  removeItem: k => { delete LSI[k] }
}

global.window = {
  localStorage: global.localStorage,
  scrollTo() {}
}
global.confirm = () => true

/* ---------- 加载引擎与页面 ---------- */

const engCode = fs.readFileSync(path.join(ROOT, 'js', 'engine.js'), 'utf8')
new Function('window', engCode)(global.window)

const appCode = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8')
new Function(appCode)()

const view = global.document.getElementById('view')
const SK = global.window.SK

/* ---------- 模拟点击 ---------- */

function click(attrs) {
  const target = {
    getAttribute(k) { return k in attrs ? attrs[k] : null },
    closest() { return target }
  }
  handlers.click.forEach(fn => fn({ target }))
}

function input(attrs) {
  const target = {
    getAttribute(k) { return k in attrs ? attrs[k] : null },
    value: attrs.value
  }
  handlers.input.forEach(fn => fn({ target }))
}

function has(text) {
  const ok = view._html.indexOf(text) > -1
  console.log((ok ? '  ✓ ' : '  ✗ ') + text)
  if (!ok) failures.push(text)
}

const failures = []
let step = 0
function title(t) { console.log('\n' + (++step) + '. ' + t) }

/* ---------- 走一遍 ---------- */

title('首屏（未建档）')
has('今天还能吃')
has('填一下身高体重')

title('切到「我的」并建档')
click({ 'data-a': 'tab', 'data-t': 'me' })
has('你的资料')
has('基础代谢 BMR')
has('识别服务（可选）')
click({ 'data-a': 'saveProfile' })

title('建档后回首页')
has('今天还能吃')
has('净摄入')
const p = SK.store.getProfile()
console.log('  档案已存：', p.gender, p.age + '岁', p.height + 'cm', p.weight + 'kg', p.goal)

title('记一餐：说一句')
click({ 'data-a': 'tab', 'data-t': 'add' })
has('说一句')
input({ 'data-in': 'text', value: '中午两碗米饭 一份红烧肉 一杯可乐' })
click({ 'data-a': 'parse' })
has('已选')
has('存进今天的记录')

title('改克数（点减号）')
click({ 'data-a': 'gram', 'data-i': '0', 'data-d': '-10' })
has('已选')

title('存进记录')
click({ 'data-a': 'save' })
has('今天吃了什么')
has('红烧肉')

const meals = SK.store.getDay(SK.store.dateKey())
console.log('  落库：', meals.length, '条 |', meals[0].items.map(i => i.name + i.gram + 'g').join(' + '))

title('记一次运动')
click({ 'data-a': 'tab', 'data-t': 'sport' })
has('记一次运动')
has('按 MET 公式算')
click({ 'data-a': 'pickSport', 'data-n': '篮球（半场）' })
has('大卡 ·')
has('练完补什么')
click({ 'data-a': 'dur', 'data-d': '45' })
click({ 'data-a': 'saveSport' })

const ex = SK.store.getDayExercise(SK.store.dateKey())
console.log('  运动落库：', ex.length, '条 |', ex[0].name, ex[0].minutes + '分钟', ex[0].kcal + 'kcal')

title('一键把练后补充加进记录')
const before = SK.store.getDay(SK.store.dateKey()).length
click({ 'data-a': 'tipAdd', 'data-n': '鸡胸肉（煮）', 'data-g': 120 })
const after = SK.store.getDay(SK.store.dateKey()).length
console.log('  ' + (after === before + 1 ? '✓' : '✗') + ' 加餐记录 ' + before + ' → ' + after)
if (after !== before + 1) failures.push('tipAdd')

title('首页汇总（含运动）')
click({ 'data-a': 'tab', 'data-t': 'home' })
has('今天动了')
has('净摄入')

title('历史')
click({ 'data-a': 'tab', 'data-t': 'history' })
has('最近 7 天')
has('明细')
click({ 'data-a': 'expand', 'data-d': SK.store.dateKey() })
has('运动')

title('删除记录')
const mid = SK.store.getDay(SK.store.dateKey())[0].id
click({ 'data-a': 'delMeal', 'data-id': mid })
console.log('  删后餐数：', SK.store.getDay(SK.store.dateKey()).length)

title('清空全部')
click({ 'data-a': 'tab', 'data-t': 'me' })
click({ 'data-a': 'clearAll' })
console.log('  档案：', SK.store.getProfile(), '| 记录：', SK.store.getDay(SK.store.dateKey()).length)

/* ---------- 结果 ---------- */

console.log('\n' + '='.repeat(46))
if (failures.length) {
  console.log('失败 ' + failures.length + ' 项：')
  failures.forEach(f => console.log('  - ' + f))
  process.exit(1)
} else {
  console.log('全部通过：渲染、建档、记餐、运动、联动、历史、删除')
}
