/* 轻量事件总线:解耦跨视图刷新与导航,避免循环依赖 */
export const bus = (function () {
  const map = {};
  return {
    on: function (ev, fn) { (map[ev] = map[ev] || []).push(fn); },
    emit: function (ev, arg) { (map[ev] || []).forEach(function (fn) { try { fn(arg); } catch (e) { console.error(e); } }); }
  };
})();

const $ = (s, r) => (r || document).querySelector(s);

const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const deepCopy = (o) => JSON.parse(JSON.stringify(o));

export const mk = (id) => { const t = document.getElementById(id); return t ? t.content.firstElementChild.cloneNode(true) : null; };

export function pad2(n) { return String(n).padStart(2, '0'); }

export function todayStr(d) { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

export function nowHM(d) { d = d || new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }

export function debounce(fn, ms) {
  let t = null;
  const wrapped = function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms); };
  wrapped.flush = function () { if (t) { clearTimeout(t); t = null; fn(); } };
  return wrapped;
}
/* 时间文本规范化:5.12 / 5:12 / 512 / 05:12 -> 05:12;无法识别返回 null */

export function normalizeTime(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/\s+/g, '');
  if (!s) return null;
  s = s.replace(/[:.。]/g, function (c) { return c === ':' ? ':' : '.'; });
  let m = s.match(/^(\d{1,2})[:.](\d{1,2})$/);
  if (!m) {
    m = s.match(/^(\d{1,2})$/);
    if (m) m = [m[0], m[1], '0'];
    else {
      const m4 = s.match(/^(\d{1,2})(\d{2})$/);
      if (m4) m = [m4[0], m4[1], m4[2]];
    }
  }
  if (!m) return null;
  const h = parseInt(m[1], 10), mi = parseInt(m[2], 10);
  if (!(h >= 0 && h <= 23 && mi >= 0 && mi <= 59)) return null;
  return pad2(h) + ':' + pad2(mi);
}

export function minutesOf(hm) {
  const n = normalizeTime(hm);
  if (!n) return -1;
  return parseInt(n.slice(0, 2), 10) * 60 + parseInt(n.slice(3), 10);
}

export function fmtStamp(ts) {
  const d = new Date(ts), now = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1) return '刚刚';
  if (diff < 60) return diff + ' 分钟前';
  if (todayStr(d) === todayStr(now)) return '今天 ' + nowHM(d);
  const y = new Date(now.getTime() - 86400000);
  if (todayStr(d) === todayStr(y)) return '昨天 ' + nowHM(d);
  if (d.getFullYear() === now.getFullYear()) return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + nowHM(d);
  return d.getFullYear() + '/' + pad2(d.getMonth() + 1) + '/' + pad2(d.getDate());
}

export const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

export let toastTimer = null;

export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2100);
}



export const Caps = (function () {
  const nav = navigator;
  const has = (o, k) => { try { return typeof o !== 'undefined' && o && k in o; } catch (e) { return false; } };
  const secure = !!window.isSecureContext;
  const notify = secure && ('Notification' in window);
  const vibrate = has(nav, 'vibrate');
  const share = has(nav, 'share');
  const clipboard = has(nav, 'clipboard') && has(nav.clipboard, 'writeText');
  const download = 'download' in document.createElement('a');
  const standalone = window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone;
  const audio = !!(window.AudioContext || window.webkitAudioContext);
  function notifyPerm() { return notify ? Notification.permission : 'unsupported'; }
  return {
    secure, notify, vibrate, share, clipboard, download, standalone, audio, notifyPerm,
    label: function () {
      return [
        { name: '安全上下文(https)', ok: secure },
        { name: '系统通知', ok: notify },
        { name: '震动', ok: vibrate },
        { name: '系统分享面板', ok: share },
        { name: '剪贴板 API', ok: clipboard },
        { name: '文件下载', ok: download },
        { name: '已装到主屏幕', ok: standalone },
        { name: '提示音', ok: audio }
      ];
    }
  };
})();
/* 提示音:WebAudio 合成,不引外部音频文件 */

export function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '0';
  ta.style.opacity = '0';
  ta.contentEditable = 'true';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

export async function copyText(text) {
  if (!text) return false;
  if (Caps.clipboard) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* 降级 */ }
  }
  return fallbackCopy(text);
}
/* 复制时把当时各变量的取值一并存进历史(剔除自动带入与日期时间),供精准复用与后续统计 */

export function flashButton(btn, labelEl, doneText) {
  const old = labelEl ? labelEl.textContent : btn.textContent;
  if (labelEl) labelEl.textContent = doneText; else btn.textContent = doneText;
  btn.classList.add('btn-success');
  setTimeout(function () {
    if (labelEl) labelEl.textContent = old; else btn.textContent = old;
    btn.classList.remove('btn-success');
  }, 1400);
}

export function escapeRe(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function monthStr(d){d=d||new Date();return d.getFullYear()+'-'+pad2(d.getMonth()+1);}

export function cnDate(iso){const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?(+m[1])+'年'+(+m[2])+'月'+(+m[3])+'日':iso;}

export function esc(s){return String(s==null?'':s);}

export function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
