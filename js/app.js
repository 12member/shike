/* 食刻 · 网页版
 * 计算全部复用 js/engine.js（由 engine/ 源码打包生成），这里只做界面和交互。 */

(function () {
  'use strict'

  var SK = window.SK
  var calc = SK.calc
  var advice = SK.advice
  var fooddb = SK.fooddb
  var sportdb = SK.sportdb
  var textparse = SK.textparse
  var store = SK.store

  var topEl = document.getElementById('top')
  var view = document.getElementById('view')
  var tabbar = document.getElementById('tabbar')

  var RING_C = 2 * Math.PI * 52

  var MACRO = [
    { k: 'carb', label: '碳水', color: '#FFCF8A' },
    { k: 'pro', label: '蛋白', color: '#A8CCFF' },
    { k: 'fat', label: '脂肪', color: '#FFB5AA' }
  ]

  var S = {
    tab: 'home',
    mealType: 'lunch',
    mode: 'text',
    source: 'text',
    draft: [],
    cat: 'staple',
    q: '',
    sportName: '',
    dur: 30,
    expanded: '',
    text: '',
    imgData: '',
    busy: false,
    form: null,
    vision: { url: '', key: '', model: '' }
  }

  /* ---------------- 小工具 ---------------- */

  function $(id) { return document.getElementById(id) }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  function r0(v) { return Math.round(Number(v) || 0) }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)) }

  var toastTimer = null
  function toast(msg, ms) {
    var t = $('toast')
    t.textContent = msg
    t.classList.add('on')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(function () { t.classList.remove('on') }, ms || 1900)
  }

  /* ---------------- 数据入口 ---------------- */

  function profile() { return store.getProfile() }

  function planOf() {
    var p = profile()
    if (!p || !p.height || !p.weight || !p.age) return null
    try { return calc.computePlan(p) } catch (e) { return null }
  }

  function todayKey() { return store.dateKey() }

  function dayBundle(key) {
    var meals = store.getDay(key)
    var ex = store.getDayExercise(key)
    return {
      meals: meals,
      ex: ex,
      totals: calc.sumMeals(meals),
      exSum: sportdb.summarize(ex)
    }
  }

  function visionCfg() {
    try {
      var raw = localStorage.getItem('sk_vision_v1')
      return raw ? JSON.parse(raw) : { url: '', key: '', model: '' }
    } catch (e) { return { url: '', key: '', model: '' } }
  }

  function saveVision(cfg) {
    try { localStorage.setItem('sk_vision_v1', JSON.stringify(cfg)) } catch (e) {}
  }

  /* ---------------- 顶部标题 ---------------- */

  function renderTop() {
    var p = profile()
    var d = new Date()
    var wk = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
    var goalMap = { lose: '减脂', maintain: '维持', gain: '增重', muscle: '增肌' }
    var right = p && p.goal ? (goalMap[p.goal] || '已建档') : '未建档'

    topEl.innerHTML =
      '<div class="topbar">' +
        '<div>' +
          '<h1>食刻</h1>' +
          '<div class="date">' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + wk + '</div>' +
        '</div>' +
        '<div class="who" data-a="tab" data-t="me">' + esc(right) + ' ›</div>' +
      '</div>' +
      // 宽屏下的左侧导航，窄屏由 CSS 隐藏，改用底部 tabbar
      '<aside class="side">' +
        '<div class="side-brand">食刻<span>今天吃了什么</span></div>' +
        '<div class="side-date">' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + wk + '</div>' +
        '<nav class="side-nav">' +
          TABS.map(function (t) {
            return '<button class="snav ' + (S.tab === t.k ? 'on' : '') + '" data-a="tab" data-t="' + t.k + '">' +
              '<span class="si">' + t.icon + '</span>' +
              '<span>' + (t.center ? '记一餐' : t.label) + '</span>' +
              '</button>'
          }).join('') +
        '</nav>' +
        '<div class="side-who" data-a="tab" data-t="me">' + esc(right) + ' ›</div>' +
      '</aside>'
  }

  /* ---------------- 首页 ---------------- */

  function ringHTML(pct) {
    var p = clamp(pct, 0, 100)
    var dash = (p / 100) * RING_C
    return '<svg class="ring" viewBox="0 0 120 120" aria-hidden="true">' +
      '<circle class="ring-bg" cx="60" cy="60" r="52"></circle>' +
      '<circle class="ring-fg" cx="60" cy="60" r="52" stroke-dasharray="' + dash.toFixed(1) + ' ' + RING_C.toFixed(1) + '" transform="rotate(-90 60 60)"></circle>' +
      '<text class="ring-txt" x="60" y="58">' + Math.round(pct) + '%</text>' +
      '<text class="ring-txt2" x="60" y="75">已摄入</text>' +
      '</svg>'
  }

  function renderHome() {
    var p = profile()
    var pl = planOf()
    var b = dayBundle(todayKey())
    var d = advice.analyze({
      plan: pl,
      totals: b.totals,
      meals: b.meals,
      exercise: b.exSum,
      gender: p ? p.gender : 'female'
    })

    var target = d.target
    var eaten = b.totals
    var pct = target.kcal > 0 ? (eaten.kcal / target.kcal) * 100 : 0
    var remain = d.remaining.kcal
    var over = remain < 0

    var html = ''

    if (!pl) {
      html += '<div class="banner"><div>填一下身高体重，我才能算出你每天该吃多少。</div>' +
        '<button class="go" data-a="tab" data-t="me">去建档</button></div>'
    }

    /* 热量卡 */
    html += '<div class="hero">' +
      '<div class="hero-top">' +
        '<div class="hero-left">' +
          '<div class="hero-label">' + (over ? '已经超出' : '今天还能吃') + '</div>' +
          '<div class="hero-big">' + r0(Math.abs(remain)) + '<small>大卡</small></div>' +
          '<div class="hero-sub">目标 ' + r0(target.kcal) + ' · 已吃 ' + r0(eaten.kcal) +
            (d.exerciseKcal ? ' · 动了 ' + r0(d.exerciseKcal) : '') + '</div>' +
        '</div>' +
        ringHTML(pct) +
      '</div>' +
      '<div class="hero-bars">' +
        MACRO.map(function (m) {
          var cur = eaten[m.k] || 0
          var tg = target[m.k] || 0
          var w = tg > 0 ? clamp((cur / tg) * 100, 0, 100) : 0
          return '<div class="mbar">' +
            '<span class="n">' + m.label + '</span>' +
            '<span class="t"><i style="width:' + w.toFixed(1) + '%;background:' + m.color + '"></i></span>' +
            '<span class="v">' + r0(cur) + ' / ' + r0(tg) + 'g</span>' +
            '</div>'
        }).join('') +
      '</div>' +
      '<div class="hero-foot">' +
        '<span>净摄入 <b>' + r0(d.netKcal) + '</b></span>' +
        '<span class="sep">·</span>' +
        '<span>运动 -<b>' + r0(d.exerciseKcal) + '</b></span>' +
        (pl ? '<span class="sep">·</span><span>BMI <b>' + pl.bmi + '</b> ' + esc(pl.level.label) + '</span>' : '') +
      '</div>' +
      '</div>'

    /* 康叔点评 */
    html += '<div class="card">' +
      '<div class="coach">' +
        '<div class="avatar">康</div>' +
        '<div class="txt">' + esc(d.coachLine) + '</div>' +
      '</div>' +
      d.tips.map(function (t, i) {
        return '<div class="tip ' + (t.level === 'high' ? 'high' : t.level === 'mid' ? 'mid' : 'ok') + '">' +
          '<div class="tip-t">' + esc(t.title) + '</div>' +
          '<div class="tip-b">' + esc(t.body) + '</div>' +
          (t.foods && t.foods.length
            ? '<div class="chips">' + t.foods.slice(0, 3).map(function (f) {
                return '<button class="chip" data-a="tipAdd" data-n="' + esc(f.name) + '" data-g="' + f.gram + '">+ ' +
                  esc(f.name) + ' ' + f.gram + 'g</button>'
              }).join('') + '</div>'
            : '') +
          '</div>'
      }).join('') +
      '</div>'

    /* 今日记录 */
    var groups = {}
    b.meals.forEach(function (m) {
      var t = m.type || 'snack'
      if (!groups[t]) groups[t] = []
      groups[t].push(m)
    })

    var order = ['breakfast', 'lunch', 'dinner', 'snack']
    var labels = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' }

    html += '<div class="card">' +
      '<div class="card-hd"><h2>今天吃了什么</h2><span class="r">' +
        (b.meals.length ? b.meals.length + ' 顿' : '还没记') + '</span></div>' +
      (b.meals.length
        ? order.filter(function (k) { return groups[k] }).map(function (k) {
            return groups[k].map(function (m) {
              var kcal = m.items.reduce(function (s, i) { return s + (i.kcal || 0) }, 0)
              return '<div class="meal">' +
                '<div class="meal-hd">' +
                  '<span class="dot ' + k + '"></span>' +
                  '<span class="name">' + labels[k] + '</span>' +
                  '<span class="time">' + esc(m.time || '') + '</span>' +
                  '<span class="kcal">' + r0(kcal) + '<span>kcal</span></span>' +
                  '<button class="del" data-a="delMeal" data-id="' + esc(m.id) + '">删</button>' +
                '</div>' +
                '<div class="meal-items">' + (m.items || []).map(function (i) {
                  return '<div class="meal-item"><span>' + esc(i.name) + '</span>' +
                    '<span class="g">' + r0(i.gram) + 'g</span>' +
                    '<span class="k">' + r0(i.kcal) + '</span></div>'
                }).join('') + '</div>' +
                '</div>'
            }).join('')
          }).join('')
        : '<div class="empty">拍一张或者说一句，先记下来再说</div>') +
      '</div>'

    /* 今日运动 */
    if (b.ex.length) {
      html += '<div class="card">' +
        '<div class="card-hd"><h2>今天动了</h2><span class="r">-' + r0(d.exerciseKcal) + ' 大卡</span></div>' +
        b.ex.map(function (x) {
          return '<div class="meal-item" style="font-size:13px">' +
            '<span>' + esc(x.name) + '</span>' +
            '<span class="g">' + x.minutes + ' 分钟</span>' +
            '<span class="k">-' + r0(x.kcal) + ' kcal</span>' +
            '<button class="del" data-a="delSport" data-id="' + esc(x.id) + '">删</button>' +
            '</div>'
        }).join('') +
        '<div class="tiny" style="margin-top:10px;line-height:1.6">运动消耗按 MET 公式算，不含手环那些虚高的数字。别拿它当多吃的借口。</div>' +
        '</div>'
    }

    html += '<div class="tiny" style="text-align:center;line-height:1.7;padding:6px 10px 4px">' +
      '热量与营养为估算值，误差通常 ±20%~30%。本工具不构成医疗建议。</div>'

    view.innerHTML = html

    // 档案变化后同步一下表单
    if (p) S.form = Object.assign({}, S.form || {}, p)
  }

  /* ---------------- 记一餐 ---------------- */

  function draftTotals() {
    return S.draft.reduce(function (a, i) {
      a.kcal += i.kcal || 0; a.carb += i.carb || 0; a.pro += i.pro || 0; a.fat += i.fat || 0
      return a
    }, { kcal: 0, carb: 0, pro: 0, fat: 0 })
  }

  function renderAdd() {
    var p = profile()
    var pl = planOf()
    var mt = store.MEAL_TYPES
    var labels = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' }

    var html = ''

    // 餐次 + 方式
    html += '<div class="seg">' + mt.map(function (t) {
      return '<button class="' + (S.mealType === t.key ? 'on' : '') + '" data-a="type" data-t="' + t.key + '">' + t.label + '</button>'
    }).join('') + '</div>'

    html += '<div class="seg">' +
      '<button class="' + (S.mode === 'text' ? 'on' : '') + '" data-a="mode" data-m="text">说一句</button>' +
      '<button class="' + (S.mode === 'manual' ? 'on' : '') + '" data-a="mode" data-m="manual">手动选</button>' +
      '<button class="' + (S.mode === 'photo' ? 'on' : '') + '" data-a="mode" data-m="photo">拍照</button>' +
      '</div>'

    // 草稿
    if (S.draft.length) {
      var t = draftTotals()
      html += '<div class="card">' +
        '<div class="card-hd"><h2>' + labels[S.mealType] + ' · 已选 ' + S.draft.length + ' 样</h2>' +
          '<span class="r num">' + r0(t.kcal) + ' kcal</span></div>' +
        S.draft.map(function (it, i) {
          return '<div class="draft-item">' +
            '<div class="draft-main">' +
              '<div class="draft-name">' + esc(it.name) + '</div>' +
              '<div class="draft-meta">碳 ' + (it.carb || 0).toFixed(1) + ' · 蛋 ' + (it.pro || 0).toFixed(1) + ' · 脂 ' + (it.fat || 0).toFixed(1) + ' · ' + r0(it.kcal) + ' kcal</div>' +
            '</div>' +
            '<div class="stepper">' +
              '<button data-a="gram" data-i="' + i + '" data-d="-10">−</button>' +
              '<input type="number" inputmode="numeric" value="' + r0(it.gram) + '" data-in="gram" data-i="' + i + '">' +
              '<button data-a="gram" data-i="' + i + '" data-d="10">+</button>' +
            '</div>' +
            '<button class="del" data-a="delDraft" data-i="' + i + '">✕</button>' +
            '</div>'
        }).join('') +
        '<div class="hr"></div>' +
        '<div class="row">' +
          '<button class="btn ghost sm" data-a="clearDraft">清空</button>' +
          '<button class="btn" data-a="save" style="flex:2">存进今天的记录</button>' +
        '</div>' +
        '</div>'
    }

    if (S.mode === 'text') {
      html += '<div class="card">' +
        '<div class="field"><label>这餐吃了什么？</label>' +
          '<textarea class="input" id="ta" data-in="text" placeholder="比如：一碗牛肉面，加了个卤蛋，还喝了半杯可乐">' + esc(S.text) + '</textarea>' +
        '</div>' +
        '<div class="tiny" style="margin:-4px 0 12px">写清主食多少、荤菜几块、有没有饮料。也可以直接写克数：鸡胸肉 150 克 西兰花 200 克。</div>' +
        '<button class="btn" data-a="parse">拆成食物</button>' +
        '<div class="tiny" style="margin:12px 0 8px">不知道怎么写？点一个试试</div>' +
        '<div class="chips">' +
          ['一碗牛肉面，加了个卤蛋', '两碗米饭、红烧肉五块、一份炒青菜', '一杯拿铁和一个可颂', '半碗米饭 一份青菜 三个饺子'].map(function (x) {
            return '<button class="chip" data-a="example" data-x="' + esc(x) + '">' + esc(x) + '</button>'
          }).join('') +
        '</div>' +
        '</div>'
    }

    if (S.mode === 'manual') {
      var foods = S.q
        ? fooddb.search(S.q)
        : fooddb.listByCat(S.cat)

      html += '<div class="card">' +
        '<div class="search"><span class="ico">⌕</span>' +
          '<input class="input" id="q" data-in="q" placeholder="搜食物，比如 米饭 / 鸡胸 / 奶茶" value="' + esc(S.q) + '">' +
        '</div>' +
        (S.q ? '' : '<div class="cats">' + fooddb.CATS.map(function (c) {
          return '<button class="' + (S.cat === c.key ? 'on' : '') + '" data-a="cat" data-c="' + c.key + '">' + c.label + '</button>'
        }).join('') + '</div>') +
        '<div class="foods" id="foodList">' +
          (foods.length ? foods.map(function (f) {
            return '<div class="food" data-a="addFood" data-i="' + f.id + '">' +
              '<div><div class="fn">' + esc(f.name) + '</div>' +
              '<div class="fp">' + esc(f.portion || '100g') + ' ≈ ' + f.defaultGram + 'g</div></div>' +
              '<span class="fk">' + f.per100.kcal + '<span style="font-size:10px">/100g</span></span>' +
              '<span class="plus">+</span>' +
              '</div>'
          }).join('') : '<div class="empty">没搜到，换个词试试</div>') +
        '</div>' +
        '</div>'
    }

    if (S.mode === 'photo') {
      var v = visionCfg()
      html += '<div class="card">' +
        '<div class="card-hd"><h2>拍一张</h2><span class="r">' + (v.url ? '识别服务已接' : '未接识别服务') + '</span></div>' +
        (v.url
          ? '<input type="file" accept="image/*" capture="environment" id="fileIn" class="input" style="padding:9px">' +
            '<div class="tiny" style="margin-top:10px;line-height:1.65">照片只用来识别，不会上传留存。识别结果请务必核对分量——照片估算误差本来就有 ±20%~30%。</div>'
          : '<div class="tip mid"><div class="tip-t">这里不内置拍照识别</div>' +
            '<div class="tip-b">把模型 Key 放进网页等于公开泄露，所以默认关着。用「说一句」或「手动选」记录，热量和营养一样算得准；如果你有自己的识别接口，到「我的 → 识别服务」填上地址就能打开。</div></div>' +
            '<button class="btn ghost" data-a="tab" data-t="me" style="margin-top:12px">去配置</button>') +
        '</div>'
    }

    html += '<div class="tiny" style="text-align:center;padding:4px 12px 8px;line-height:1.65">' +
      '数字不对就改分量，比相信一个精确的假数字有用得多。</div>'

    view.innerHTML = html

    if (S.mode === 'photo' && visionCfg().url) {
      var input = $('fileIn')
      if (input) input.addEventListener('change', onFile)
    }
  }

  /* ---------------- 运动 ---------------- */

  function renderSport() {
    var p = profile()
    var weight = p && p.weight ? p.weight : sportdb.DEFAULT_WEIGHT
    var selected = S.sportName ? sportdb.findByName(S.sportName) : null
    var burn = selected ? sportdb.burn(selected.met, S.dur, weight) : null
    var tip = selected ? sportdb.recoveryTip(selected.kind, S.dur, burn.kcal, weight) : null
    var ex = store.getDayExercise(todayKey())
    var cats = sportdb.CATS
    var list = sportdb.listByCat(S.catS || cats[0])

    var html = '<div class="card">' +
      '<div class="card-hd"><h2>记一次运动</h2><span class="r">按 MET 公式算</span></div>' +
      '<div class="cats">' + cats.map(function (c) {
        return '<button class="' + ((S.catS || cats[0]) === c ? 'on' : '') + '" data-a="catS" data-c="' + c + '">' + c + '</button>'
      }).join('') + '</div>' +
      '<div class="sports">' + list.map(function (s) {
        return '<button class="sport ' + (S.sportName === s.name ? 'on' : '') + '" data-a="pickSport" data-n="' + esc(s.name) + '">' +
          '<div class="sn">' + esc(s.name) + '</div>' +
          '<div class="sm">MET ' + s.met + '</div>' +
          '</button>'
      }).join('') + '</div>' +
      '</div>'

    if (selected) {
      html += '<div class="card">' +
        '<div class="card-hd"><h2>' + esc(selected.name) + '</h2><span class="r">' + weight + 'kg</span></div>' +
        '<div class="durs">' +
          [15, 30, 45, 60, 90].map(function (m) {
            return '<button class="' + (S.dur === m ? 'on' : '') + '" data-a="dur" data-d="' + m + '">' + m + '分钟</button>'
          }).join('') +
          '<input class="input" style="width:86px;padding:8px 10px;font-size:13px" type="number" inputmode="numeric" value="' + S.dur + '" data-in="dur">' +
        '</div>' +
        '<div class="burn"><b>' + burn.kcal + '</b><span>大卡 · ' + selected.met + ' MET × ' + weight + 'kg × ' +
          (S.dur / 60).toFixed(2) + 'h</span></div>' +
        (burn.isDefaultWeight ? '<div class="tiny" style="margin:-6px 0 10px">还没建档，按 60kg 估的。填了体重会更准。</div>' : '') +
        '<button class="btn" data-a="saveSport">记下来</button>' +
        '</div>'

      if (tip) {
        html += '<div class="card">' +
          '<div class="card-hd"><h2>练完补什么</h2></div>' +
          '<div class="tip ok"><div class="tip-t">' + esc(tip.title) + '</div>' +
          '<div class="tip-b">' + esc(tip.body) + '</div>' +
          (tip.foods.length ? '<div class="chips">' + tip.foods.map(function (f) {
            return '<button class="chip" data-a="tipAdd" data-n="' + esc(f.name) + '" data-g="' + f.gram + '">+ ' + esc(f.name) + ' ' + f.gram + 'g</button>'
          }).join('') + '</div>' : '') +
          '</div></div>'
      }
    }

    if (ex.length) {
      html += '<div class="card">' +
        '<div class="card-hd"><h2>今天的运动</h2><span class="r">共 -' + r0(ex.reduce(function (s, x) { return s + x.kcal }, 0)) + ' kcal</span></div>' +
        ex.map(function (x) {
          return '<div class="meal-item" style="font-size:13px">' +
            '<span>' + esc(x.name) + '</span><span class="g">' + x.minutes + ' 分钟</span>' +
            '<span class="k">-' + r0(x.kcal) + ' kcal</span>' +
            '<button class="del" data-a="delSport" data-id="' + esc(x.id) + '">删</button></div>'
        }).join('') +
        '</div>'
    }

    html += '<div class="tiny" style="text-align:center;padding:4px 12px 8px;line-height:1.65">' +
      '手环报的消耗普遍比公式高 30%~50%，这里用公式值。拿虚高的数字奖励自己多吃，是最常见的减不下来原因。</div>'

    view.innerHTML = html
  }

  /* ---------------- 我的 ---------------- */

  function renderMe() {
    var p = profile()
    if (!S.form) S.form = p ? Object.assign({}, p) : { gender: 'female', age: 28, height: 165, weight: 60, activity: 'light', goal: 'lose' }

    var f = S.form
    var pl = null
    try { pl = calc.computePlan(f) } catch (e) {}

    var html = ''

    html += '<div class="card result" id="resultBox">' + resultHTML(pl) + '</div>'

    html += '<div class="card">' +
      '<div class="card-hd"><h2>你的资料</h2></div>' +
      '<div class="row">' +
        '<div class="field"><label>性别</label>' +
          '<div class="seg" style="margin:0">' +
            '<button class="' + (f.gender === 'female' ? 'on' : '') + '" data-a="gender" data-v="female">女</button>' +
            '<button class="' + (f.gender === 'male' ? 'on' : '') + '" data-a="gender" data-v="male">男</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="row">' +
        '<div class="field"><label>年龄</label>' +
          '<input class="input" type="number" inputmode="numeric" value="' + (f.age || '') + '" data-in="f_age" placeholder="28"></div>' +
        '<div class="field"><label>身高 cm</label>' +
          '<input class="input" type="number" inputmode="numeric" value="' + (f.height || '') + '" data-in="f_height" placeholder="165"></div>' +
      '</div>' +
      '<div class="row">' +
        '<div class="field"><label>体重 kg</label>' +
          '<input class="input" type="number" inputmode="decimal" value="' + (f.weight || '') + '" data-in="f_weight" placeholder="60"></div>' +
        '<div class="field"><label>活动量</label>' +
          '<select class="input" data-in="f_activity">' +
            Object.keys(calc.ACTIVITY).map(function (k) {
              return '<option value="' + k + '"' + (f.activity === k ? ' selected' : '') + '>' +
                calc.ACTIVITY[k].label + '（' + calc.ACTIVITY[k].desc + '）</option>'
            }).join('') +
          '</select></div>' +
      '</div>' +
      '<div class="field"><label>目标</label>' +
        '<div class="seg" style="margin:0">' + Object.keys(calc.GOALS).map(function (k) {
          return '<button class="' + (f.goal === k ? 'on' : '') + '" data-a="goal" data-v="' + k + '">' + calc.GOALS[k].label + '</button>'
        }).join('') + '</div>' +
      '</div>' +
      '<button class="btn" data-a="saveProfile" style="margin-top:4px">保存</button>' +
      '</div>'

    /* 识别服务 */
    var v = visionCfg()
    html += '<div class="card">' +
      '<div class="card-hd"><h2>识别服务（可选）</h2>' +
        '<span class="r">' + (v.url ? '已配置' : '未配置') + '</span></div>' +
      '<div class="tiny" style="margin-bottom:12px;line-height:1.7">' +
        '不配也能用：文字用内置词典拆，食物从 118 条库里挑。要自动认照片，得有个接口，' +
        '因为模型 Key 不能直接写在网页里。</div>' +
      '<div class="field"><label>接口地址</label>' +
        '<input class="input" data-in="v_url" value="' + esc(v.url) + '" placeholder="/api/recognize 或 https://..."></div>' +
      '<div class="field"><label>模型名（可选）</label>' +
        '<input class="input" data-in="v_model" value="' + esc(v.model) + '" placeholder="hunyuan-vision / qwen-vl-max"></div>' +
      '<div class="field"><label>Key（走本地 server.js 时留空）</label>' +
        '<input class="input" data-in="v_key" value="' + esc(v.key) + '" placeholder="留空更安全"></div>' +
      '<button class="btn ghost sm" data-a="saveVision">保存配置</button>' +
      '</div>'

    /* 数据 */
    html += '<div class="card">' +
      '<div class="card-hd"><h2>数据</h2></div>' +
      '<div class="setting"><span class="k">存储位置</span><span class="v">只在这台设备的浏览器里</span></div>' +
      '<div class="setting"><span class="k">保留时长</span><span class="v">最近 90 天</span></div>' +
      '<button class="btn danger sm" data-a="clearAll" style="margin-top:14px">清空全部记录</button>' +
      '</div>'

    html += '<div class="tiny" style="text-align:center;padding:8px 14px 10px;line-height:1.8">' +
      '食刻是饮食记录工具，不提供医疗建议、诊断或治疗。<br>孕期、哺乳期、慢性病患者请遵医生或注册营养师指导。</div>'

    view.innerHTML = html
  }

  function resultHTML(pl) {
    if (!pl) {
      return '<div class="tiny">填完资料，这里会出现你的 BMI、基础代谢和每日热量目标。</div>'
    }
    return '<div class="big"><b>' + pl.bmi + '</b>' +
        '<span class="tag">BMI ' + esc(pl.level.label) + '</span></div>' +
      '<div class="tiny">健康区间 ' + pl.weightRange.min + '~' + pl.weightRange.max + ' kg · ' + esc(pl.level.tip) + '</div>' +
      '<div class="kv">' +
        '<div><div class="k">基础代谢 BMR</div><div class="v">' + pl.bmr + '<small>kcal</small></div></div>' +
        '<div><div class="k">每日消耗 TDEE</div><div class="v">' + pl.tdee + '<small>kcal</small></div></div>' +
        '<div><div class="k">每日目标</div><div class="v">' + pl.kcalTarget + '<small>kcal</small></div></div>' +
        '<div><div class="k">蛋白目标</div><div class="v">' + pl.macros.pro.g + '<small>g</small></div></div>' +
      '</div>' +
      '<div class="steps">' + (pl.bmrSteps || []).map(function (s) { return '<code>' + esc(s) + '</code>' }).join(' ') + '</div>' +
      '<div class="tip ' + (pl.warnings && pl.warnings.length ? 'mid' : 'ok') + '" style="margin-top:13px">' +
        '<div class="tip-t">' + esc(pl.goal.label) + ' · 每周 ' + (pl.weeklyDelta > 0 ? '+' : '') + pl.weeklyDelta + 'kg</div>' +
        '<div class="tip-b">' + esc(pl.summary) + '</div>' +
        (pl.warnings || []).map(function (w) { return '<div class="tip-b" style="margin-top:6px;color:#8A5A00">' + esc(w) + '</div>' }).join('') +
      '</div>'
  }

  /* ---------------- 历史 ---------------- */

  function renderHistory() {
    var key = todayKey()
    var days = []
    for (var i = 6; i >= 0; i--) {
      var k = store.shiftDay(key, -i)
      var b = dayBundle(k)
      days.push({
        key: k,
        label: k.slice(5, 7) + '/' + k.slice(8, 10),
        wk: store.weekdayCN(k).replace('周', ''),
        kcal: b.totals.kcal,
        ex: r0(b.ex.reduce(function (s, x) { return s + x.kcal }, 0)),
        meals: b.meals,
        exList: b.ex,
        isToday: k === key
      })
    }

    var pl = planOf()
    var target = pl ? pl.kcalTarget : 1800
    var max = Math.max(target, days.reduce(function (m, d) { return Math.max(m, d.kcal) }, 0), 1)

    var html = ''

    html += '<div class="card w2">' +
      '<div class="card-hd"><h2>最近 7 天</h2><span class="r">目标 ' + target + '</span></div>' +
      '<div class="chart">' + days.map(function (d) {
        var h = d.kcal > 0 ? Math.max(3, (d.kcal / max) * 74) : 0
        var cls = d.isToday ? 'today' : (d.kcal > target * 1.05 ? 'over' : '')
        return '<div class="col ' + cls + '">' +
          '<div class="val">' + (d.kcal ? r0(d.kcal) : '') + '</div>' +
          '<div class="bar" style="height:' + h + '%"></div>' +
          '<div class="lab">' + d.wk + '</div>' +
          '</div>'
      }).join('') + '</div>' +
      '<div class="tiny" style="margin-top:6px">柱子按每日摄入画，超过目标 5% 标红。运动消耗另外算。</div>' +
      '</div>'

    var has = days.filter(function (d) { return d.meals.length || d.exList.length })
    has.reverse()

    html += '<div class="card">' +
      '<div class="card-hd"><h2>明细</h2><span class="r">' + (has.length ? '有记录 ' + has.length + ' 天' : '') + '</span></div>' +
      (has.length ? has.map(function (d) {
        var open = S.expanded === d.key
        return '<div class="day" data-a="expand" data-d="' + d.key + '">' +
          '<div><div class="d1">' + d.label + ' <span class="d2">' + (d.isToday ? '今天' : d.wk) + '</span></div>' +
          '<div class="d2">' + d.meals.length + ' 餐' + (d.exList.length ? ' · ' + d.exList.length + ' 次运动' : '') + '</div></div>' +
          '<div class="d3">' + r0(d.kcal) + '<span> kcal</span></div>' +
          '</div>' +
          (open ? '<div style="padding:2px 0 12px">' +
            d.meals.map(function (m) {
              var lb = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' }[m.type] || '其他'
              return '<div class="meal-item" style="font-size:12.5px"><span>' + lb + '</span>' +
                '<span class="g">' + (m.items || []).map(function (i) { return esc(i.name) }).join('、') + '</span></div>'
            }).join('') +
            d.exList.map(function (x) {
              return '<div class="meal-item" style="font-size:12.5px;color:#3D8BFD"><span>运动</span>' +
                '<span class="g">' + esc(x.name) + ' ' + x.minutes + '分</span>' +
                '<span class="k">-' + r0(x.kcal) + '</span></div>'
            }).join('') +
            '</div>' : '')
      }).join('') : '<div class="empty">还没有记录</div>') +
      '</div>'

    view.innerHTML = html
  }

  /* ---------------- 路由 ---------------- */

  var TABS = [
    { k: 'home', icon: '◉', label: '今日' },
    { k: 'history', icon: '◫', label: '历史' },
    { k: 'add', icon: '+', label: '', center: true },
    { k: 'sport', icon: '◈', label: '运动' },
    { k: 'me', icon: '☰', label: '我的' }
  ]

  function renderTabbar() {
    tabbar.innerHTML = TABS.map(function (t) {
      return '<button class="tab ' + (S.tab === t.k ? 'on' : '') + (t.center ? ' center' : '') + '" data-a="tab" data-t="' + t.k + '">' +
        '<span class="ti">' + t.icon + '</span>' +
        (t.label ? '<span>' + t.label + '</span>' : '') +
        '</button>'
    }).join('')
  }

  function go(tab) {
    S.tab = tab
    render()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function render() {
    renderTop()
    renderTabbar()
    // 宽屏按页签决定栅格：今日/历史双列，表单类页签单列居中
    view.className = 'tab-' + S.tab

    // 进记餐页时，按时间猜一个餐次
    if (S.tab === 'add' && !S.started) {
      S.mealType = store.guessMealType()
      S.started = true
    }

    if (S.tab === 'home') renderHome()
    else if (S.tab === 'add') renderAdd()
    else if (S.tab === 'sport') renderSport()
    else if (S.tab === 'me') renderMe()
    else renderHistory()
  }

  /* ---------------- 交互：点击 ---------------- */

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-a]')
    if (!t) return
    var a = t.getAttribute('data-a')

    if (a === 'tab') { go(t.getAttribute('data-t')); return }

    if (a === 'type') { S.mealType = t.getAttribute('data-t'); renderAdd(); return }
    if (a === 'mode') { S.mode = t.getAttribute('data-m'); renderAdd(); return }
    if (a === 'cat') { S.cat = t.getAttribute('data-c'); S.q = ''; renderAdd(); return }
    if (a === 'catS') { S.catS = t.getAttribute('data-c'); renderSport(); return }
    if (a === 'example') { S.text = t.getAttribute('data-x'); renderAdd(); var ta = $('ta'); if (ta) ta.focus(); return }

    if (a === 'parse') { doParse(); return }
    if (a === 'addFood') { addFoodById(t.getAttribute('data-i')); return }
    if (a === 'delDraft') { S.draft.splice(Number(t.getAttribute('data-i')), 1); renderAdd(); return }
    if (a === 'clearDraft') { S.draft = []; renderAdd(); return }
    if (a === 'save') { doSaveMeal(); return }
    if (a === 'delMeal') { store.removeMeal(t.getAttribute('data-id')); toast('已删除'); render(); return }
    if (a === 'delSport') { store.removeExercise(t.getAttribute('data-id')); toast('已删除'); render(); return }

    if (a === 'gram') {
      var i = Number(t.getAttribute('data-i'))
      var dg = Number(t.getAttribute('data-d'))
      setGram(i, S.draft[i].gram + dg)
      return
    }

    if (a === 'tipAdd') { quickAdd(t.getAttribute('data-n'), Number(t.getAttribute('data-g'))); return }

    if (a === 'pickSport') { S.sportName = t.getAttribute('data-n'); renderSport(); return }
    if (a === 'dur') { S.dur = Number(t.getAttribute('data-d')); renderSport(); return }
    if (a === 'saveSport') { doSaveSport(); return }

    if (a === 'gender') { S.form.gender = t.getAttribute('data-v'); renderMe(); return }
    if (a === 'goal') { S.form.goal = t.getAttribute('data-v'); renderMe(); return }
    if (a === 'saveProfile') { doSaveProfile(); return }
    if (a === 'saveVision') { doSaveVision(); return }
    if (a === 'clearAll') { doClearAll(); return }

    if (a === 'expand') {
      var k = t.getAttribute('data-d')
      S.expanded = S.expanded === k ? '' : k
      renderHistory()
      return
    }
  })

  /* ---------------- 交互：输入 ---------------- */

  document.addEventListener('input', function (e) {
    var t = e.target
    var tag = t.getAttribute && t.getAttribute('data-in')
    if (!tag) return

    if (tag === 'text') { S.text = t.value; return }
    if (tag === 'q') {
      S.q = t.value
      var list = $('foodList')
      if (list) list.innerHTML = foodListHTML()
      return
    }
    if (tag === 'gram') {
      setGram(Number(t.getAttribute('data-i')), Number(t.value), true)
      return
    }
    if (tag === 'dur') {
      S.dur = clamp(Number(t.value) || 0, 1, 600)
      refreshBurn()
      return
    }
    if (tag === 'f_age' || tag === 'f_height' || tag === 'f_weight') {
      var key = tag.replace('f_', '')
      S.form[key] = Number(t.value) || 0
      refreshResult()
      return
    }
    if (tag === 'v_url' || tag === 'v_model' || tag === 'v_key') {
      S.vision[tag.slice(2)] = t.value
      return
    }
  })

  document.addEventListener('change', function (e) {
    var t = e.target
    var tag = t.getAttribute && t.getAttribute('data-in')
    if (tag === 'f_activity') {
      S.form.activity = t.value
      refreshResult()
      return
    }
    // 克数输入框被清空或失焦时，重绘一次把非法值纠正回来
    if (tag === 'gram') {
      if (!t.value) setGram(Number(t.getAttribute('data-i')), 1)
      renderAdd()
      return
    }
    if (tag === 'dur') {
      if (!t.value) S.dur = 30
      renderSport()
    }
  })

  /* ---------------- 业务动作 ---------------- */

  function setGram(i, g, fromInput) {
    var it = S.draft[i]
    if (!it) return
    var gram = clamp(Math.round(Number(g) || 1), 1, 2000)
    it.gram = gram
    var f = fooddb.findByName(it.name)
    if (f) {
      var v = fooddb.nutrientOf(f, gram)
      it.kcal = v.kcal; it.carb = v.carb; it.pro = v.pro; it.fat = v.fat
    }
    if (fromInput) {
      // 输入时不要整页重绘，否则会丢焦点；只更新这一行的营养数字
      var row = document.querySelectorAll('.draft-item')[i]
      if (row) {
        row.querySelector('.draft-meta').textContent =
          '碳 ' + it.carb.toFixed(1) + ' · 蛋 ' + it.pro.toFixed(1) + ' · 脂 ' + it.fat.toFixed(1) + ' · ' + r0(it.kcal) + ' kcal'
      }
      var hd = document.querySelector('.card-hd .r.num')
      if (hd) hd.textContent = r0(draftTotals().kcal) + ' kcal'
    } else {
      renderAdd()
    }
  }

  function foodListHTML() {
    var foods = S.q ? fooddb.search(S.q) : fooddb.listByCat(S.cat)
    if (!foods.length) return '<div class="empty">没搜到，换个词试试</div>'
    return foods.map(function (f) {
      return '<div class="food" data-a="addFood" data-i="' + f.id + '">' +
        '<div><div class="fn">' + esc(f.name) + '</div>' +
        '<div class="fp">' + esc(f.portion || '100g') + ' ≈ ' + f.defaultGram + 'g</div></div>' +
        '<span class="fk">' + f.per100.kcal + '<span style="font-size:10px">/100g</span></span>' +
        '<span class="plus">+</span></div>'
    }).join('')
  }

  function pushDraft(name, gram) {
    var f = fooddb.findByName(name)
    if (!f) { toast('食物库里没有「' + name + '」'); return false }
    var g = gram || f.defaultGram
    var v = fooddb.nutrientOf(f, g)
    S.draft.push({ name: f.name, gram: g, kcal: v.kcal, carb: v.carb, pro: v.pro, fat: v.fat })
    return true
  }

  function addFoodById(id) {
    var f = fooddb.FOODS.filter(function (x) { return x.id === id })[0]
    if (!f) return
    pushDraft(f.name, f.defaultGram)
    toast('加了 ' + f.name)
    renderAdd()
  }

  function quickAdd(name, gram) {
    if (pushDraft(name, gram)) {
      // 快捷加餐直接落库，不打断当前页
      var it = S.draft[S.draft.length - 1]
      S.draft.pop()
      store.addMeal({
        id: store.uid(),
        ts: Date.now(),
        time: store.nowTimeText(),
        type: 'snack',
        source: 'tip',
        items: [it]
      })
      toast('已记入加餐：' + it.name)
      if (S.tab === 'home' || S.tab === 'sport') render()
    }
  }

  function doParse() {
    var text = (S.text || '').trim()
    if (text.length < 2) { toast('先说一句吃了什么'); return }

    var r = textparse.parse(text)
    if (!r.items.length) {
      toast('没从这句话里认出食物，写具体点试试')
      return
    }

    var added = 0
    r.items.forEach(function (i) {
      S.draft.push({ name: i.name, gram: i.gram, kcal: i.kcal, carb: i.carb, pro: i.pro, fat: i.fat })
      added++
    })

    S.source = 'text'
    S.mode = 'manual'
    S.q = ''
    toast('拆出 ' + added + ' 样，分量可以改')
    renderAdd()

    if (r.unmatched.length) {
      setTimeout(function () {
        toast('「' + r.unmatched.join('」「') + '」没认出来，可以在下面手动补')
      }, 2000)
    }
  }

  function doSaveMeal() {
    if (!S.draft.length) { toast('还没选食物'); return }
    store.addMeal({
      id: store.uid(),
      ts: Date.now(),
      time: store.nowTimeText(),
      type: S.mealType,
      source: S.source,
      items: S.draft.map(function (i) {
        return { name: i.name, gram: i.gram, kcal: i.kcal, carb: i.carb, pro: i.pro, fat: i.fat }
      })
    })
    S.draft = []
    S.text = ''
    S.mode = 'text'
    S.source = 'text'
    toast('记下了')
    go('home')
  }

  function doSaveSport() {
    if (!S.sportName) { toast('先选个运动'); return }
    var p = profile()
    var w = p && p.weight ? p.weight : sportdb.DEFAULT_WEIGHT
    var s = sportdb.findByName(S.sportName)
    if (!s) return
    var b = sportdb.burn(s.met, S.dur, w)
    store.addExercise({
      id: store.uid(),
      ts: Date.now(),
      time: store.nowTimeText(),
      name: s.name,
      met: s.met,
      kind: s.kind,
      minutes: S.dur,
      kcal: b.kcal,
      weight: w
    })
    toast('记下了，-' + b.kcal + ' 大卡')
    render()
  }

  function doSaveProfile() {
    var f = S.form
    if (!f.age || !f.height || !f.weight) { toast('年龄、身高、体重都要填'); return }
    if (f.age < 10 || f.age > 100) { toast('年龄填得对吗'); return }
    if (f.height < 120 || f.height > 230) { toast('身高填得对吗'); return }
    if (f.weight < 30 || f.weight > 250) { toast('体重填得对吗'); return }

    store.saveProfile({
      gender: f.gender,
      age: Number(f.age),
      height: Number(f.height),
      weight: Number(f.weight),
      activity: f.activity,
      goal: f.goal,
      updatedAt: Date.now()
    })
    toast('已保存')
    go('home')
  }

  function doSaveVision() {
    var cfg = {
      url: (S.vision.url || '').trim(),
      model: (S.vision.model || '').trim(),
      key: (S.vision.key || '').trim()
    }
    saveVision(cfg)
    toast(cfg.url ? '已保存，可以去拍照了' : '已清空')
    renderMe()
  }

  function doClearAll() {
    if (!confirm('确定清空所有饮食和运动记录？档案也会一起删掉，无法恢复。')) return
    store.clearAll()
    if (store.clearProfile) store.clearProfile()
    S.draft = []
    S.form = null
    toast('已清空')
    go('home')
  }

  function refreshResult() {
    var box = $('resultBox')
    if (!box) return
    var pl = null
    try { pl = calc.computePlan(S.form) } catch (e) {}
    box.innerHTML = resultHTML(pl)
  }

  function refreshBurn() {
    var p = profile()
    var w = p && p.weight ? p.weight : sportdb.DEFAULT_WEIGHT
    var s = sportdb.findByName(S.sportName)
    if (!s) return
    var b = sportdb.burn(s.met, S.dur, w)
    var el = document.querySelector('.burn b')
    if (el) el.textContent = b.kcal
    var sp = document.querySelector('.burn span')
    if (sp) sp.textContent = '大卡 · ' + s.met + ' MET × ' + w + 'kg × ' + (S.dur / 60).toFixed(2) + 'h'
  }

  /* ---------------- 拍照识别 ---------------- */

  function onFile(e) {
    var file = e.target.files && e.target.files[0]
    if (!file) return
    var cfg = visionCfg()
    if (!cfg.url) { toast('还没配识别服务'); return }

    toast('正在看这张图…', 8000)

    compress(file).then(function (b64) {
      var headers = { 'Content-Type': 'application/json' }
      var body = { image: b64, model: cfg.model || '' }
      if (cfg.key) { headers['Authorization'] = 'Bearer ' + cfg.key; body.key = cfg.key }

      return fetch(cfg.url, { method: 'POST', headers: headers, body: JSON.stringify(body) })
        .then(function (r) { return r.json() })
    }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || '识别失败')
      var items = calc.normalizeItems(j.data.items || [])
      if (!items.length) throw new Error('图里没认出食物')

      items.forEach(function (i) {
        S.draft.push({ name: i.name, gram: i.gram, kcal: i.kcal, carb: i.carb, pro: i.pro, fat: i.fat })
      })
      S.source = 'photo'
      S.mode = 'manual'
      toast('认出 ' + items.length + ' 样，核对一下分量')
      renderAdd()
    }).catch(function (err) {
      var msg = err && err.message ? err.message : '识别失败'
      if (/Failed to fetch|NetworkError|CORS/i.test(msg)) {
        msg = '连不上接口，可能是跨域被拦了。用自带的 server.js 跑就不会有这个问题'
      }
      toast(msg, 4200)
    })
  }

  /** 压到 1024px 以内再转 base64，别把 5MB 原图直接发出去 */
  function compress(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader()
      reader.onload = function () {
        var img = new Image()
        img.onload = function () {
          var max = 1024
          var scale = Math.min(1, max / Math.max(img.width, img.height))
          var w = Math.round(img.width * scale)
          var h = Math.round(img.height * scale)
          var cv = document.createElement('canvas')
          cv.width = w
          cv.height = h
          cv.getContext('2d').drawImage(img, 0, 0, w, h)
          resolve(cv.toDataURL('image/jpeg', 0.82))
        }
        img.onerror = function () { reject(new Error('这张图打不开')) }
        img.src = reader.result
      }
      reader.onerror = function () { reject(new Error('读不到文件')) }
      reader.readAsDataURL(file)
    })
  }

  /* ---------------- 启动 ---------------- */

  S.vision = visionCfg()

  var p0 = profile()
  if (p0) S.form = Object.assign({}, p0)

  render()
})()
