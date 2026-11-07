/**
 * 把小程序的计算引擎原样打包成浏览器可用的 engine.js
 *
 * 为什么这么做：营养计算、食物库、运动库、建议规则这些逻辑一份就够，
 * 小程序和网站应该共用，不要复制粘贴出两套会各自跑偏的代码。
 *
 * 用法：node build.js
 */
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'shike-miniprogram', 'utils')
const MODS = ['fooddb', 'textparse', 'sportdb', 'calc', 'advice', 'store']

let body = ''
for (const name of MODS) {
  const file = path.join(SRC, name + '.js')
  const src = fs.readFileSync(file, 'utf8')
  body += `__def(${JSON.stringify(name)}, function (module, exports, require) {\n${src}\n})\n\n`
}

const head = `/* eslint-disable */
/**
 * 自动生成，请勿手改。
 * 源文件：../shike-miniprogram/utils/*.js
 * 重新生成：node build.js
 */
(function (global) {
  'use strict'

  var __M = {}
  var __C = {}

  function __def(n, f) { __M[n] = f }

  function __req(raw) {
    var n = String(raw).replace(/^\\.\\//, '').replace(/\\.js$/, '')
    if (__C[n]) return __C[n].exports
    if (!__M[n]) throw new Error('模块不存在: ' + raw)
    var m = { exports: {} }
    __C[n] = m
    __M[n](m, m.exports, __req)
    return m.exports
  }

  /* store.js 是照着小程序写的，这里把 localStorage 伪装成 wx 存储接口 */
  var LS = global.localStorage
  var wxShim = {
    getStorageSync: function (k) {
      try {
        var v = LS.getItem(k)
        return v === null ? '' : JSON.parse(v)
      } catch (e) { return '' }
    },
    setStorageSync: function (k, v) {
      try { LS.setItem(k, JSON.stringify(v)) } catch (e) {}
    },
    removeStorageSync: function (k) {
      try { LS.removeItem(k) } catch (e) {}
    }
  }
  global.wx = wxShim
  // 模块体内直接写的是 wx.xxx，这里给它一个作用域内的同名变量，
  // 这样不管跑在浏览器还是被当作脚本加载，都能解析到
  var wx = wxShim

`

const tail = `
  global.SK = {}
  ;['calc', 'advice', 'fooddb', 'sportdb', 'textparse', 'store'].forEach(function (n) {
    global.SK[n] = __req(n)
  })
})(window)
`

const out = head + body + tail
const dest = path.join(__dirname, 'js', 'engine.js')
fs.writeFileSync(dest, out, 'utf8')

const kb = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1)
console.log(`已生成 js/engine.js  ${kb} KB  （源：${MODS.join(' / ')}）`)
