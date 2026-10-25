#!/usr/bin/env node
/**
 * Builds the copy of the Apps Script page that tinyurl.com/interpresapp opens.
 *
 *   node scripts/standalone.mjs <out.html>
 *
 * Google shows "Sorry, unable to open the file at this time" on
 * script.google.com to visitors whose browser is signed into a personal Gmail
 * that does not own the script, before any of our code runs. This copy is
 * served from jsDelivr instead (see publish-jsdelivr.sh) and talks to the same
 * web app with plain, cookie-free web requests, so no Google account is
 * involved.
 *
 * It is exactly the page the live web app serves (taken from it, not rebuilt),
 * with one script added first: a google.script.run that sends api() calls to
 * doPost and collects the answer from doGet(?result=id), the same two requests
 * pages/client.js makes for the Pages site. No server change is needed
 * (doPost only takes the routes the page calls, HTTP_ROUTES_ in Code.js).
 *
 * The loader (open.svg) fills in "__STANDALONE_BOOT__" with the route asked
 * for; without it the page opens on the home page.
 */

import fs from 'node:fs';
import vm from 'node:vm';

const NAME = 'INTERPRES';
const API = 'https://script.google.com/macros/s/AKfycbyfS0EeA5rlHcOyaDjO88BjaxAes0Zwvsh92wXzPKYgDciVoRuDa2eQXZ_eiJNECofn/exec';

const SHIM = `<script>/* runs outside script.google.com: google.script.run goes to the web app as plain web requests (no Google sign-in) */
(function () {
  if (window.google && window.google.script) return;
  var API = ${JSON.stringify(API)};
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function result(id) {
    return fetch(API + '?result=' + encodeURIComponent(id), { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (out) { return out && typeof out.status === 'number' ? out : null; });
  }
  function collect(id, deadline) {
    return result(id).then(function (out) {
      if (out) return out;
      if (Date.now() > deadline) throw new Error('The server answered, but its reply was lost.');
      return wait(400).then(function () { return collect(id, deadline); });
    });
  }
  var calls = {
    api: function (request) {
      request = request || {};
      return fetch(API, {
        method: 'POST', credentials: 'omit',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ method: request.method, url: request.url, headers: request.headers, body: request.body }),
      }).then(function (r) {
        if (!r.ok) throw new Error('The server could not be reached (' + r.status + ').');
        return r.json();
      }).then(function (o) {
        if (!o || !o.id) throw new Error((o && o.error) || 'The server did not accept the request.');
        return collect(o.id, Date.now() + 60000);
      });
    },
    apiResult: function (id) { return result(id); },
  };
  function runner(ok, fail) {
    return new Proxy({}, { get: function (_, name) {
      if (name === 'withSuccessHandler') return function (f) { return runner(f, fail); };
      if (name === 'withFailureHandler') return function (f) { return runner(ok, f); };
      if (name === 'withUserObject') return function () { return runner(ok, fail); };
      return function () {
        var args = arguments, fn = calls[name];
        Promise.resolve().then(function () {
          if (!fn) throw new Error('Not available here: ' + String(name));
          return fn.apply(null, args);
        }).then(function (v) { if (ok) ok(v); }, function (e) { if (fail) fail(e); });
      };
    } });
  }
  window.google = { script: { run: runner(null, null) } };
})();</script>`;

async function livePage() {
  const response = await fetch(API, { redirect: 'follow' });
  if (!response.ok) throw new Error(`the web app answered ${response.status}`);
  const text = await response.text();
  const at = text.indexOf('goog.script.init(');
  if (at < 0) throw new Error('the web app did not serve its page (a Google sign-in or permission screen?)');
  let end = at + 18;
  while (text[end] !== '"') end += text[end] === '\\' ? 2 : 1;
  const literal = text.slice(at + 17, end + 1);
  const init = JSON.parse(vm.runInNewContext(literal));
  if (typeof init.userHtml !== 'string') throw new Error('no page in the web app\'s answer');
  return init.userHtml;
}

const out = process.argv[2];
if (!out) throw new Error('usage: node scripts/standalone.mjs <out.html>');

let html = await livePage();
const boot = new RegExp(`window\\.__${NAME}__ = \\{[^<]*?\\};`);
if (!boot.test(html)) throw new Error('could not find the boot settings in the page');
html = html.replace(boot, () => `window.__${NAME}__ = "__STANDALONE_BOOT__";`);
const head = html.indexOf('<head>');
if (head < 0) throw new Error('no <head> in the page');
html = html.slice(0, head + 6) + SHIM + html.slice(head + 6);
for (const [index, script] of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].entries()) {
  new vm.Script(script[1], { filename: `script ${index + 1}` });
}
fs.writeFileSync(out, html);
console.log(`${out} ← live page, ${(html.length / 1024).toFixed(0)} KB`);
