/* eslint-disable */
/**
 * 自动生成，请勿手改。
 * 源文件：engine/*.js
 * 重新生成：node build.js
 */
(function (global) {
  'use strict'

  var __M = {}
  var __C = {}

  function __def(n, f) { __M[n] = f }

  function __req(raw) {
    var n = String(raw).replace(/^\.\//, '').replace(/\.js$/, '')
    if (__C[n]) return __C[n].exports
    if (!__M[n]) throw new Error('模块不存在: ' + raw)
    var m = { exports: {} }
    __C[n] = m
    __M[n](m, m.exports, __req)
    return m.exports
  }

  /* 存储层：用 localStorage 实现 engine/store.js 需要的 storage 接口 */
  var LS = global.localStorage
  var storage = {
    get: function (k) {
      try {
        var v = LS.getItem(k)
        return v === null ? '' : JSON.parse(v)
      } catch (e) { return '' }
    },
    set: function (k, v) {
      try { LS.setItem(k, JSON.stringify(v)) } catch (e) {}
    },
    remove: function (k) {
      try { LS.removeItem(k) } catch (e) {}
    }
  }

__def("fooddb", function (module, exports, require) {
/**
 * 常见食物营养库
 * 数据参考《中国食物成分表（第 6 版）》常见值，每 100g（饮品每 100ml）计。
 * 数值为通用参考值，实际因食材、做法、油量差异可达 ±20%~30%。
 *
 * 压缩格式：[名称, 热量kcal, 碳水g, 蛋白g, 脂肪g, 默认份量g, 份量说明, 分类]
 * 分类：staple 主食 / meat 肉蛋 / veg 蔬菜 / fruit 水果 / nut 坚果零食 / drink 饮品 / fast 外食
 */

const CATS = [
  { key: 'staple', label: '主食' },
  { key: 'meat', label: '肉蛋豆' },
  { key: 'veg', label: '蔬菜' },
  { key: 'fruit', label: '水果' },
  { key: 'nut', label: '坚果零食' },
  { key: 'drink', label: '饮品' },
  { key: 'fast', label: '外食快餐' }
]

const RAW = [
  // ================= 主食 =================
  ['白米饭', 116, 25.9, 2.6, 0.3, 200, '一碗', 'staple'],
  ['杂粮饭', 118, 24.6, 3.2, 0.7, 200, '一碗', 'staple'],
  ['白粥', 46, 9.8, 1.1, 0.3, 300, '一碗', 'staple'],
  ['小米粥', 46, 9.0, 1.4, 0.7, 300, '一碗', 'staple'],
  ['馒头', 223, 47.0, 7.0, 1.1, 100, '一个', 'staple'],
  ['全麦面包', 246, 41.0, 9.0, 4.2, 60, '两片', 'staple'],
  ['白吐司', 250, 47.0, 8.0, 3.5, 60, '两片', 'staple'],
  ['燕麦片（干）', 377, 66.0, 15.0, 7.0, 40, '一小碗', 'staple'],
  ['煮面条', 110, 24.0, 4.0, 0.4, 250, '一碗', 'staple'],
  ['荞麦面', 99, 21.0, 3.4, 0.6, 250, '一碗', 'staple'],
  ['意大利面（煮）', 158, 31.0, 5.8, 0.9, 200, '一份', 'staple'],
  ['米线/河粉', 110, 24.0, 2.0, 0.2, 250, '一碗', 'staple'],
  ['蒸红薯', 86, 20.0, 1.6, 0.2, 200, '一个中等', 'staple'],
  ['蒸紫薯', 82, 19.0, 1.4, 0.2, 200, '一个中等', 'staple'],
  ['蒸土豆', 77, 17.0, 2.0, 0.1, 200, '一个中等', 'staple'],
  ['玉米（煮）', 106, 22.0, 4.0, 1.2, 200, '一根', 'staple'],
  ['猪肉白菜饺子', 230, 26.0, 8.0, 10.0, 200, '10 个', 'staple'],
  ['肉包子', 227, 30.0, 8.0, 8.0, 100, '一个', 'staple'],
  ['蛋炒饭', 180, 26.0, 4.5, 6.5, 300, '一盘', 'staple'],
  ['油条', 388, 51.0, 6.9, 17.6, 60, '一根', 'staple'],
  ['手抓饼', 320, 38.0, 6.0, 16.0, 120, '一个', 'staple'],
  ['牛肉面', 130, 18.0, 7.0, 4.0, 450, '一碗', 'staple'],
  ['炸酱面', 180, 28.0, 7.0, 6.0, 450, '一碗', 'staple'],
  ['热干面', 190, 30.0, 6.0, 6.0, 400, '一碗', 'staple'],
  ['番茄鸡蛋面', 110, 16.0, 5.0, 3.0, 450, '一碗', 'staple'],
  ['馄饨（汤）', 90, 12.0, 5.0, 2.5, 350, '一碗', 'staple'],
  ['小笼包', 230, 25.0, 9.0, 10.0, 150, '6 个', 'staple'],
  ['烧麦', 220, 26.0, 8.0, 8.0, 100, '3 个', 'staple'],
  ['煎饼果子', 280, 33.0, 9.0, 12.0, 200, '一个', 'staple'],
  ['三明治', 250, 30.0, 11.0, 9.0, 150, '一个', 'staple'],
  ['饭团', 180, 33.0, 5.0, 3.0, 120, '一个', 'staple'],

  // ================= 肉蛋豆 =================
  ['鸡胸肉（煮）', 133, 2.5, 19.4, 5.0, 120, '一块', 'meat'],
  ['鸡腿肉（去皮）', 181, 0.0, 16.0, 13.0, 100, '一个', 'meat'],
  ['炸鸡（带皮）', 279, 8.0, 22.0, 18.0, 120, '一块', 'meat'],
  ['猪里脊', 155, 0.7, 20.2, 7.9, 100, '一份', 'meat'],
  ['猪五花肉', 568, 0.0, 9.3, 59.0, 100, '一份', 'meat'],
  ['红烧肉', 472, 6.0, 12.0, 45.0, 120, '一份', 'meat'],
  ['瘦牛肉', 106, 1.2, 20.2, 2.3, 100, '一份', 'meat'],
  ['煎牛排', 250, 0.0, 26.0, 16.0, 150, '一块', 'meat'],
  ['羊肉（瘦）', 118, 0.2, 20.5, 3.9, 100, '一份', 'meat'],
  ['三文鱼', 139, 0.0, 17.2, 7.8, 100, '一份', 'meat'],
  ['清蒸鲈鱼', 105, 0.0, 18.6, 3.4, 150, '半条', 'meat'],
  ['带鱼', 127, 3.1, 17.7, 4.9, 100, '两段', 'meat'],
  ['白灼虾', 93, 2.8, 18.6, 0.8, 100, '8 只', 'meat'],
  ['酸菜鱼/水煮鱼', 150, 2.0, 15.0, 9.0, 250, '一份', 'meat'],
  ['火腿肠', 212, 15.6, 14.0, 10.4, 50, '一根', 'meat'],
  ['培根', 181, 0.0, 22.0, 10.0, 30, '两片', 'meat'],
  ['鸡蛋（煮）', 144, 2.8, 13.3, 8.8, 50, '一个', 'meat'],
  ['煎蛋', 196, 1.0, 13.5, 15.0, 55, '一个', 'meat'],
  ['蛋白', 60, 3.0, 11.6, 0.1, 35, '一个', 'meat'],
  ['北豆腐', 98, 2.0, 12.2, 4.8, 100, '一块', 'meat'],
  ['嫩豆腐', 57, 3.0, 6.0, 2.7, 100, '一块', 'meat'],
  ['卤豆干', 140, 6.0, 16.0, 6.0, 50, '两片', 'meat'],
  ['全脂牛奶', 54, 3.4, 3.0, 3.2, 250, '一盒', 'meat'],
  ['脱脂牛奶', 33, 5.0, 3.4, 0.2, 250, '一盒', 'meat'],
  ['无糖酸奶', 72, 9.3, 2.5, 2.7, 150, '一杯', 'meat'],
  ['含糖酸奶', 90, 13.0, 3.0, 2.5, 150, '一杯', 'meat'],
  ['无糖豆浆', 31, 1.2, 3.0, 1.6, 300, '一杯', 'meat'],
  ['番茄炒蛋', 90, 4.0, 5.0, 6.0, 200, '一份', 'meat'],
  ['宫保鸡丁', 200, 8.0, 14.0, 13.0, 180, '一份', 'meat'],
  ['鱼香肉丝', 190, 10.0, 12.0, 12.0, 180, '一份', 'meat'],
  ['麻婆豆腐', 130, 6.0, 9.0, 8.0, 200, '一份', 'meat'],
  ['白切鸡', 190, 0.0, 20.0, 12.0, 120, '一份', 'meat'],
  ['烤鸭', 240, 2.0, 19.0, 17.0, 100, '一份', 'meat'],
  ['可乐鸡翅', 210, 8.0, 16.0, 13.0, 150, '4 个', 'meat'],

  // ================= 蔬菜 =================
  ['白灼菜心', 30, 3.0, 2.0, 0.4, 150, '一份', 'veg'],
  ['西兰花（焯）', 36, 4.3, 4.1, 0.6, 150, '一份', 'veg'],
  ['清炒时蔬', 90, 5.0, 2.0, 7.0, 150, '一份', 'veg'],
  ['重油炒青菜', 120, 5.0, 2.0, 10.0, 150, '一份', 'veg'],
  ['红烧茄子', 150, 8.0, 1.5, 12.0, 150, '一份', 'veg'],
  ['凉拌木耳', 60, 6.0, 1.5, 3.5, 100, '一碟', 'veg'],
  ['拍黄瓜', 40, 2.9, 0.8, 2.5, 120, '一碟', 'veg'],
  ['番茄', 20, 4.0, 0.9, 0.2, 150, '一个', 'veg'],
  ['黄瓜', 16, 2.9, 0.8, 0.2, 150, '一根', 'veg'],
  ['生菜', 15, 2.0, 1.3, 0.3, 100, '一小份', 'veg'],
  ['菌菇汤', 25, 3.0, 1.5, 0.5, 250, '一碗', 'veg'],
  ['炒豆芽', 80, 4.0, 2.5, 6.0, 150, '一份', 'veg'],
  ['紫菜蛋花汤', 25, 2.0, 2.0, 1.0, 250, '一碗', 'veg'],
  ['番茄蛋汤', 30, 3.0, 2.0, 1.5, 250, '一碗', 'veg'],

  // ================= 水果 =================
  ['苹果', 53, 13.7, 0.2, 0.2, 200, '一个', 'fruit'],
  ['香蕉', 93, 22.0, 1.4, 0.2, 120, '一根', 'fruit'],
  ['橙子', 48, 11.0, 0.8, 0.2, 200, '一个', 'fruit'],
  ['葡萄', 44, 10.0, 0.5, 0.2, 150, '一小串', 'fruit'],
  ['西瓜', 31, 7.0, 0.6, 0.1, 300, '一块', 'fruit'],
  ['蓝莓', 57, 14.0, 0.7, 0.3, 100, '一盒', 'fruit'],
  ['牛油果', 171, 7.4, 2.0, 15.3, 100, '半个', 'fruit'],
  ['圣女果', 25, 5.0, 1.0, 0.2, 150, '一小盒', 'fruit'],
  ['猕猴桃', 61, 14.5, 0.8, 0.6, 100, '一个', 'fruit'],

  // ================= 坚果零食 =================
  ['混合坚果', 600, 20.0, 18.0, 50.0, 25, '一小把', 'nut'],
  ['核桃', 646, 19.0, 15.0, 59.0, 20, '三颗', 'nut'],
  ['炒花生', 601, 21.0, 24.0, 44.0, 30, '一小把', 'nut'],
  ['薯片', 548, 53.0, 6.0, 35.0, 50, '一小包', 'nut'],
  ['巧克力', 586, 53.0, 4.3, 40.0, 30, '三块', 'nut'],
  ['奶油蛋糕', 347, 47.0, 6.0, 15.0, 80, '一块', 'nut'],
  ['消化饼干', 435, 71.0, 8.0, 13.0, 40, '四片', 'nut'],
  ['冰淇淋', 207, 24.0, 3.5, 11.0, 100, '一个', 'nut'],

  // ================= 饮品 =================
  ['可乐', 43, 10.8, 0.0, 0.0, 330, '一罐', 'drink'],
  ['奶茶（全糖）', 70, 12.0, 1.0, 2.2, 500, '一杯', 'drink'],
  ['奶茶（三分糖）', 50, 8.0, 1.0, 2.0, 500, '一杯', 'drink'],
  ['美式咖啡（无糖）', 2, 0.3, 0.1, 0.0, 350, '一杯', 'drink'],
  ['拿铁（全脂）', 55, 5.0, 3.0, 2.8, 350, '一杯', 'drink'],
  ['啤酒', 32, 3.0, 0.3, 0.0, 500, '一瓶', 'drink'],
  ['白酒（52 度）', 298, 0.0, 0.0, 0.0, 50, '一两', 'drink'],
  ['鲜榨橙汁', 45, 10.0, 0.7, 0.2, 300, '一杯', 'drink'],
  ['无糖气泡水', 0, 0.0, 0.0, 0.0, 500, '一瓶', 'drink'],

  // ================= 外食快餐 =================
  ['牛肉汉堡', 250, 27.0, 13.0, 10.0, 200, '一个', 'fast'],
  ['炸鸡腿', 279, 8.0, 22.0, 18.0, 120, '一个', 'fast'],
  ['披萨', 266, 30.0, 11.0, 11.0, 150, '一块', 'fast'],
  ['麻辣烫（清汤）', 90, 6.0, 6.0, 5.0, 500, '一份', 'fast'],
  ['螺蛳粉', 130, 20.0, 4.0, 4.0, 500, '一碗', 'fast'],
  ['兰州拉面', 120, 20.0, 5.0, 2.0, 500, '一碗', 'fast'],
  ['黄焖鸡米饭', 150, 18.0, 7.0, 6.0, 500, '一份', 'fast'],
  ['鸡胸沙拉', 90, 5.0, 8.0, 4.5, 300, '一份', 'fast'],
  ['关东煮', 80, 8.0, 6.0, 3.0, 200, '一份', 'fast'],
  ['火锅（牛油锅涮菜）', 180, 6.0, 10.0, 13.0, 500, '一顿', 'fast'],
  ['麻辣香锅', 250, 10.0, 12.0, 18.0, 400, '一份', 'fast'],
  ['冒菜', 150, 8.0, 8.0, 9.0, 500, '一份', 'fast'],
  ['烧烤（肉串）', 300, 3.0, 25.0, 21.0, 150, '5 串', 'fast']
]

const FOODS = RAW.map((r, i) => ({
  id: 'f' + i,
  name: r[0],
  per100: { kcal: r[1], carb: r[2], pro: r[3], fat: r[4] },
  // 热量按营养素养分回算校验，确保展示自洽
  kcal100: Math.round(r[2] * 4 + r[3] * 4 + r[4] * 9) || r[1],
  defaultGram: r[5],
  portion: r[6],
  cat: r[7]
}))


/** 按分类取食物 */
function listByCat(cat) {
  return FOODS.filter(f => f.cat === cat)
}

/** 关键词搜索（名称模糊匹配） */
function search(kw) {
  const k = String(kw || '').trim()
  if (!k) return []
  return FOODS.filter(f => f.name.indexOf(k) > -1).slice(0, 30)
}

/** 去掉括号补充说明，便于比较：「西兰花（焯）」→「西兰花」 */
function normName(s) {
  return String(s || '')
    .replace(/[（(].*?[)）]/g, '')
    .trim()
}

/**
 * 按名称找食物。
 * AI 返回的名字往往和库里的不完全一致（「蒜蓉西兰花」「一碗米饭」），
 * 所以做四级匹配：精确 → 去括号精确 → 双向包含 → 去修饰词核心词。
 */
function findByName(name) {
  if (!name) return null
  const n = String(name).trim()
  const nn = normName(n)
  if (!n) return null

  let hit = FOODS.find(f => f.name === n)
  if (hit) return hit

  hit = FOODS.find(f => normName(f.name) === nn)
  if (hit) return hit

  hit = FOODS.find(f => {
    const fn = normName(f.name)
    return fn.length > 1 && (fn.indexOf(nn) > -1 || nn.indexOf(fn) > -1)
  })
  if (hit) return hit

  // 去掉做法/修饰词再试一次：「蒜蓉西兰花」→「西兰花」
  const core = nn.replace(/(蒜蓉|清炒|红烧|白灼|水煮|干锅|凉拌|香煎|油炸|麻辣|糖醋|爆炒|蒸|煮|烤|炒|炸|拌)/g, '')
  if (core && core !== nn && core.length > 1) {
    hit = FOODS.find(f => {
      const fn = normName(f.name)
      return fn.indexOf(core) > -1 || core.indexOf(fn) > -1
    })
    if (hit) return hit
  }

  // 去掉份量前缀再试一次：「一碗米饭」→「米饭」
  const bare = nn.replace(/^(一|半|两|二|三|几)?(大|小)?(碗|份|盘|个|杯|瓶|块|片|根|只|串|盒|袋|勺)/, '').trim()
  if (bare && bare !== nn && bare.length > 1) {
    hit = FOODS.find(f => {
      const fn = normName(f.name)
      return fn.indexOf(bare) > -1 || bare.indexOf(fn) > -1
    })
  }
  return hit || null
}

/** 按克数算出实际营养 */
function nutrientOf(food, gram) {
  const g = Number(gram) || 0
  const k = g / 100
  return {
    kcal: Math.round(food.per100.kcal * k),
    carb: +(food.per100.carb * k).toFixed(1),
    pro: +(food.per100.pro * k).toFixed(1),
    fat: +(food.per100.fat * k).toFixed(1)
  }
}

/** 首页推荐加餐用的「补蛋白」清单 */
const PROTEIN_PICKS = ['鸡蛋（煮）', '鸡胸肉（煮）', '无糖酸奶', '北豆腐', '白灼虾', '脱脂牛奶']
/** 补蔬菜 */
const VEG_PICKS = ['白灼菜心', '西兰花（焯）', '拍黄瓜', '菌菇汤', '番茄']

/**
 * 口语别名 → 库内标准名
 * 文字输入时的第一道匹配，长词优先（"面包"要先于"面"命中）
 */
const ALIAS = {
  // 主食
  米饭: '白米饭', 白饭: '白米饭', 大米饭: '白米饭', 饭: '白米饭',
  杂粮饭: '杂粮饭', 五谷饭: '杂粮饭', 糙米饭: '杂粮饭',
  粥: '白粥', 白米粥: '白粥', 稀饭: '白粥', 小米粥: '小米粥',
  馒头: '馒头', 包子: '肉包子', 肉包: '肉包子',
  面包: '白吐司', 吐司: '白吐司', 全麦面包: '全麦面包',
  燕麦: '燕麦片（干）', 麦片: '燕麦片（干）',
  面条: '煮面条', 面: '煮面条', 挂面: '煮面条',
  拉面: '兰州拉面', 牛肉面: '兰州拉面', 刀削面: '煮面条',
  意面: '意大利面（煮）', 意大利面: '意大利面（煮）',
  米线: '米线/河粉', 河粉: '米线/河粉', 米粉: '米线/河粉',
  红薯: '蒸红薯', 地瓜: '蒸红薯', 紫薯: '蒸紫薯',
  土豆: '蒸土豆', 马铃薯: '蒸土豆',
  玉米: '玉米（煮）', 饺子: '猪肉白菜饺子', 水饺: '猪肉白菜饺子',
  炒饭: '蛋炒饭', 蛋炒饭: '蛋炒饭', 油条: '油条', 手抓饼: '手抓饼',

  // 肉蛋豆
  鸡胸: '鸡胸肉（煮）', 鸡胸肉: '鸡胸肉（煮）',
  鸡腿: '鸡腿肉（去皮）', 炸鸡: '炸鸡（带皮）',
  猪肉: '猪里脊', 里脊: '猪里脊', 五花肉: '猪五花肉', 红烧肉: '红烧肉', 排骨: '红烧肉',
  牛肉: '瘦牛肉', 牛排: '煎牛排', 羊肉: '羊肉（瘦）',
  三文鱼: '三文鱼', 鱼: '清蒸鲈鱼', 鲈鱼: '清蒸鲈鱼', 带鱼: '带鱼',
  虾: '白灼虾', 酸菜鱼: '酸菜鱼/水煮鱼', 水煮鱼: '酸菜鱼/水煮鱼',
  火腿: '火腿肠', 香肠: '火腿肠', 培根: '培根',
  鸡蛋: '鸡蛋（煮）', 煮蛋: '鸡蛋（煮）', 水煮蛋: '鸡蛋（煮）',
  煎蛋: '煎蛋', 荷包蛋: '煎蛋', 蛋: '鸡蛋（煮）',
  牛奶: '全脂牛奶', 奶: '全脂牛奶', 脱脂奶: '脱脂牛奶',
  酸奶: '无糖酸奶', 豆浆: '无糖豆浆', 豆腐: '北豆腐', 豆干: '卤豆干',

  // 蔬菜
  青菜: '清炒时蔬', 时蔬: '清炒时蔬', 蔬菜: '清炒时蔬', 炒菜: '清炒时蔬',
  西兰花: '西兰花（焯）', 菜心: '白灼菜心', 茄子: '红烧茄子',
  木耳: '凉拌木耳', 黄瓜: '拍黄瓜', 番茄: '番茄', 西红柿: '番茄',
  生菜: '生菜', 蘑菇: '菌菇汤', 菌菇: '菌菇汤', 豆芽: '炒豆芽',

  // 水果
  苹果: '苹果', 香蕉: '香蕉', 橙子: '橙子', 橘子: '橙子', 葡萄: '葡萄',
  西瓜: '西瓜', 蓝莓: '蓝莓', 牛油果: '牛油果',
  圣女果: '圣女果', 小番茄: '圣女果', 猕猴桃: '猕猴桃', 奇异果: '猕猴桃',

  // 坚果零食
  坚果: '混合坚果', 核桃: '核桃', 花生: '炒花生', 薯片: '薯片',
  巧克力: '巧克力', 蛋糕: '奶油蛋糕', 饼干: '消化饼干',
  冰淇淋: '冰淇淋', 雪糕: '冰淇淋', 冰激凌: '冰淇淋',

  // 饮品
  可乐: '可乐', 奶茶: '奶茶（全糖）', 咖啡: '美式咖啡（无糖）',
  美式: '美式咖啡（无糖）', 拿铁: '拿铁（全脂）',
  啤酒: '啤酒', 白酒: '白酒（52 度）', 橙汁: '鲜榨橙汁', 果汁: '鲜榨橙汁',
  气泡水: '无糖气泡水',

  // 外食
  汉堡: '牛肉汉堡', 披萨: '披萨', 比萨: '披萨', 麻辣烫: '麻辣烫（清汤）',
  螺蛳粉: '螺蛳粉', 黄焖鸡: '黄焖鸡米饭', 沙拉: '鸡胸沙拉',
  关东煮: '关东煮', 火锅: '火锅（牛油锅涮菜）', 烧烤: '烧烤（肉串）',
  卤蛋: '鸡蛋（煮）', 茶叶蛋: '鸡蛋（煮）'
}

/**
 * 从一句口语描述里找出最可能的食物条目
 * 匹配顺序：库内精确名 → 别名（长词优先）→ 库名包含（长名优先）
 */
function matchText(text) {
  const s = String(text || '').trim()
  if (!s) return null

  const exact = FOODS.find(f => f.name === s)
  if (exact) return exact

  const keys = Object.keys(ALIAS).sort((a, b) => b.length - a.length)
  for (let i = 0; i < keys.length; i++) {
    if (s.indexOf(keys[i]) > -1) {
      const f = FOODS.find(x => x.name === ALIAS[keys[i]])
      if (f) return f
    }
  }

  const cands = FOODS.filter(f => s.indexOf(f.name) > -1).sort(
    (a, b) => b.name.length - a.name.length
  )
  return cands.length ? cands[0] : null
}

module.exports = {
  CATS,
  FOODS,
  ALIAS,
  listByCat,
  search,
  findByName,
  matchText,
  nutrientOf,
  PROTEIN_PICKS,
  VEG_PICKS
}

})

__def("textparse", function (module, exports, require) {
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

})

__def("sportdb", function (module, exports, require) {
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

})

__def("calc", function (module, exports, require) {
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

})

__def("advice", function (module, exports, require) {
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

})

__def("store", function (module, exports, require) {
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

})


  global.SK = {}
  ;['calc', 'advice', 'fooddb', 'sportdb', 'textparse', 'store'].forEach(function (n) {
    global.SK[n] = __req(n)
  })
})(window)
