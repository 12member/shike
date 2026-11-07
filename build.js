/**
 * 把 engine/ 下的计算引擎源码打包成浏览器可直接加载的 js/engine.js
 *
 * 营养计算、食物库、运动库、建议规则全部集中在 engine/ 里维护，
 * 页面只引用打包产物，不要在 js/engine.js 上手改。
 *
 * 用法：node build.js
 */
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, 'engine')
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
 * 源文件：engine/*.js
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
