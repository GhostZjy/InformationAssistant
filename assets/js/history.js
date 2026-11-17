import { $, bus, copyText, debounce, deepCopy, fmtStamp, mk, toast, todayStr } from './core.js';
import { openTplMakerSheet, openWithValues, parseHistoryToValues } from './report.js';
import { data, save, tplById } from './store.js';
import { Sheet } from './ui.js';

export let histFilter = '全部';

export let histQuery = '';

export function renderHistory() {
  const list = data.history || [];
  const today = todayStr();
  const weekAgo = Date.now() - 7 * 86400000;
  $('#statToday').textContent = String(list.filter(function (h) { return todayStr(new Date(h.createdAt)) === today; }).length);
  $('#statWeek').textContent = String(list.filter(function (h) { return h.createdAt >= weekAgo; }).length);
  $('#statTotal').textContent = String(list.length);
  const bar = $('#histFilterBar');
  bar.innerHTML = '';
  const names = [];
  list.forEach(function (h) { if (h.templateName && names.indexOf(h.templateName) < 0) names.push(h.templateName); });
  if (names.length > 1) {
    ['全部'].concat(names).forEach(function (n) {
      const c = mk('tpl-chip');
      c.textContent = n;
      c.setAttribute('aria-pressed', n === histFilter ? 'true' : 'false');
      c.addEventListener('click', function () { histFilter = n; renderHistory(); });
      bar.appendChild(c);
    });
    bar.hidden = false;
  } else { bar.hidden = true; }
  const box = $('#historyList');
  box.innerHTML = '';
  const shown = list.filter(function (h) {
    if (histFilter !== '全部' && h.templateName !== histFilter) return false;
    if (histQuery && h.text.toLowerCase().indexOf(histQuery.toLowerCase()) < 0) return false;
    return true;
  });
  if (!shown.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = list.length ? '这个筛选下还没有记录' : '还没有上报记录。每次点「复制结果」都会自动存到这里,方便回溯和复用。';
    box.appendChild(e);
    return;
  }
  shown.slice(0, 100).forEach(function (h) {
    const node = mk('tpl-hist-item');
    $('.hm-tpl', node).textContent = h.templateName || '自由文本';
    $('.hm-time', node).textContent = fmtStamp(h.createdAt);
    const textEl = $('.hist-text', node);
    textEl.textContent = h.text;
    const more = $('.hi-more', node);
    if (h.text.length < 90) more.hidden = true;
    more.addEventListener('click', function () {
      const open = textEl.classList.toggle('expanded');
      more.textContent = open ? '收起' : '展开';
    });
    $('.hi-copy', node).addEventListener('click', async function () {
      const ok = await copyText(h.text);
      toast(ok ? '已复制到剪贴板' : '复制失败,请长按文本手动复制');
    });
    $('.hi-reuse', node).addEventListener('click', function () { reuseHistory(h); });
    $('.hi-make', node).addEventListener('click', function () { openTplMakerSheet(h.text, h.templateName); });
    $('.hi-del', node).addEventListener('click', function () {
      Sheet.confirmSheet({
        title: '删除这条记录?', message: '删除后无法恢复。', okText: '删除', danger: true,
        detail: h.text.slice(0, 300),
        onOk: function () {
          data.history = data.history.filter(function (x) { return x.id !== h.id; });
          save(); renderHistory(); toast('已删除');
        }
      });
    });
    box.appendChild(node);
  });
}

/* 把一条历史上报文本按当前模板结构反解回各变量的值:
   模板里的固定文字当锚点,变量按类型给精确模式,可选段整段可选。
   含物品清单的模板无法可靠反解,直接判失败,由调用方回落到上次填写内容。 */

export function reuseHistory(h) {
  const tpl = tplById(h.templateId);
  if (!tpl) {
    copyText(h.text).then(function (ok) {
      toast(ok ? '原模板已删除,已把这条内容复制到剪贴板' : '原模板已删除,请长按文本手动复制');
    });
    return;
  }
  let vals = null, mode = 'cache';
  if (h.vals && typeof h.vals === 'object') { vals = deepCopy(h.vals); mode = 'snap'; }
  else {
    const parsed = parseHistoryToValues(tpl, h.text);
    if (parsed.ok) { vals = parsed.values; mode = parsed.loose ? 'loose' : 'parse'; }
  }
  bus.emit('navigate', 'report');
  openWithValues(tpl.id, vals);
  toast(mode === 'loose' ? '已回填,但人员或选项与当前设置对不上,请核对后再发'
      : mode === 'cache' ? '这条记录与当前模板结构对不上,已载入该模板上次填写的内容'
      : '已按这条记录回填,日期时间已更新为当前');
  setTimeout(function () {
    const f = document.querySelector('#formArea input:not([type=hidden]), #formArea select, #formArea textarea');
    if (f && f.focus) { try { f.focus({ preventScroll: false }); } catch (e) { try { f.focus(); } catch (e2) {} } }
  }, 160);
}

export function bindHistory() {
  $('#btnClearHistory').addEventListener('click', function () {
    if (!data.history.length) { toast('还没有记录'); return; }
    Sheet.confirmSheet({
      title: '清空全部上报记录?', message: '将删除 ' + data.history.length + ' 条记录,此操作不可恢复。', okText: '清空', danger: true,
      onOk: function () { data.history = []; save(); renderHistory(); toast('已清空'); }
    });
  });
  const histSearch = $('#histSearch');
  histSearch.addEventListener('input', debounce(function () { histQuery = histSearch.value; renderHistory(); }, 200));
}
