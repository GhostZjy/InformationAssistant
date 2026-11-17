import { $, $$, Caps, WEEK_CN, bus, deepCopy, mk, normalizeTime, nowHM, toast, todayStr, uid } from './core.js';
import { lastRefreshMin, maybeRefreshDatetime, refreshDatetimeFields } from './report.js';
import { data, isDoneToday, itemWindow, periodText, save, sortedTimeline, statusOf, tplById } from './store.js';
import { Sheet, Sound } from './ui.js';

export function tickClock() {
  const d = new Date();
  const t = $('#clockTime');
  if (t) t.textContent = nowHM(d);
}

export let lastListSig = '';

export function renderTimeline(force) {
  const d = new Date();
  const nowMin = d.getHours() * 60 + d.getMinutes();
  $('#clockTime').textContent = nowHM(d);
  $('#clockDate').textContent = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + WEEK_CN[d.getDay()] + ' · ' + periodText(d.getHours());
  const list = sortedTimeline();
  const current = list.filter(function (i) { return statusOf(i, nowMin) === 'current'; })[0] || null;
  const badge = $('#clockBadge');
  badge.textContent = current ? '进行中' : (list.length ? '今日 ' + list.length + ' 项' : '今日无任务');
  const nowWrap = $('#clockNow');
  $('.cn-label', nowWrap).textContent = '进行中';
  if (current) {
    nowWrap.hidden = false;
    $('#clockNowTask').textContent = current.task + (current.end ? '(至 ' + current.end + ')' : '');
  } else {
    const next = list.filter(function (i) { return statusOf(i, nowMin) === 'future'; })[0];
    if (next) {
      nowWrap.hidden = false;
      $('#clockNowTask').textContent = '下一项 ' + next.start + ' ' + next.task;
      $('.cn-label', nowWrap).textContent = '待开始';
    } else {
      nowWrap.hidden = !list.length;
      if (list.length) $('#clockNowTask').textContent = '今日任务已全部结束';
    }
  }
  const doneCount = list.filter(isDoneToday).length;
  $('#progressText').textContent = doneCount + ' / ' + list.length;
  $('#progressFill').style.width = (list.length ? Math.round(doneCount / list.length * 100) : 0) + '%';
  renderTodo(list, nowMin, doneCount);
  const sig = list.map(function (i) {
    return [i.id, i.start, i.end, i.task, i.desc, i.crossDay, isDoneToday(i) ? 1 : 0, statusOf(i, nowMin)].join('|');
  }).join('#') + '#' + nowMin;
  if (!force && sig === lastListSig) return;
  lastListSig = sig;
  const box = $('#timelineList');
  box.innerHTML = '';
  if (!list.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = '还没有任务,点下方「管理任务」添加每日流程。给任务绑定「联动模板」,到点自动切换';
    box.appendChild(e);
    return;
  }
  list.forEach(function (item) {
    const st = statusOf(item, nowMin);
    const done = isDoneToday(item);
    const node = mk('tpl-tl-item');
    node.className = 'tl-item ' + (done ? 'done' : st);
    $('.tl-time .ti-time', node).textContent = item.end ? (item.start + ' - ' + item.end) : item.start;
    const tags = $('.ti-tags', node);
    if (st === 'current' && !done) { const t = document.createElement('span'); t.className = 'tag live'; t.textContent = '进行中'; tags.appendChild(t); }
    if (st === 'past' && !done) { const t = document.createElement('span'); t.className = 'tag over'; t.textContent = '已过'; tags.appendChild(t); }
    if (st === 'invalid') { const t = document.createElement('span'); t.className = 'tag over'; t.textContent = '时间待修正'; tags.appendChild(t); }
    if (item.crossDay) { const t = document.createElement('span'); t.className = 'tag night'; t.textContent = '跨天'; tags.appendChild(t); }
    if (Array.isArray(item.tplIds) && item.tplIds.length) {
      const names = item.tplIds.map(function (id) { const tt = tplById(id); return tt ? tt.name : null; }).filter(Boolean);
      if (names.length) { const t = document.createElement('span'); t.className = 'tag link-tpl'; t.textContent = '联动:' + names.join('/'); tags.appendChild(t); }
    }
    if (done) { const t = document.createElement('span'); t.className = 'tag live'; t.textContent = '已完成 ' + (item.done.at || ''); tags.appendChild(t); }
    $('.tl-task', node).textContent = item.task || '(未命名任务)';
    const descEl = $('.tl-desc', node);
    if (item.desc) { descEl.textContent = item.desc; descEl.hidden = false; }
    const chk = $('.tl-check', node);
    chk.setAttribute('aria-pressed', done ? 'true' : 'false');
    chk.setAttribute('aria-label', (done ? '取消完成:' : '标记完成:') + (item.task || ''));
    chk.addEventListener('click', function () {
      if (done) { item.done = null; }
      else { item.done = { date: todayStr(), at: nowHM() }; }
      save(); renderTimeline(true);
      if (!done) toast('已记录完成 ' + (item.done ? item.done.at : ''));
    });
    box.appendChild(node);
  });
}

export function openTimelineSheet() {
  const items = deepCopy(data.timeline);
  let dirty = false;
  const bodyNode = document.createElement('div');
  const listBox = document.createElement('div');
  bodyNode.appendChild(listBox);
  const addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'btn btn-ghost btn-block';
  addBtn.style.marginTop = '10px';
  addBtn.textContent = '+ 添加任务';
  bodyNode.appendChild(addBtn);
  const tip = document.createElement('p');
  tip.className = 'section-note';
  tip.style.marginTop = '10px';
  tip.textContent = '时间支持 08:30、8.30、830 等写法,保存时自动规范化;夜班请打开「跨天」,例如 22:00 - 02:00。';
  bodyNode.appendChild(tip);
  function paint() {
    listBox.innerHTML = '';
    if (!items.length) {
      const e = document.createElement('div');
      e.className = 'empty';
      e.textContent = '还没有任务,点下方「+ 添加任务」,每个任务可绑定联动模板';
      listBox.appendChild(e);
      return;
    }
    items.forEach(function (it, idx) {
      const node = mk('tpl-tl-edit');
      $('.di-title', node).textContent = '任务 ' + (idx + 1);
      const st = $('.te-start', node), en = $('.te-end', node), tk = $('.te-task', node), ds = $('.te-desc', node);
      st.value = it.start || ''; en.value = it.end || ''; tk.value = it.task || ''; ds.value = it.desc || '';
      st.addEventListener('input', function () { it.start = st.value; dirty = true; });
      en.addEventListener('input', function () { it.end = en.value; dirty = true; });
      tk.addEventListener('input', function () { it.task = tk.value; dirty = true; });
      ds.addEventListener('input', function () { it.desc = ds.value; dirty = true; });
      st.addEventListener('blur', function () { const n = normalizeTime(st.value); st.value = n || ''; it.start = n || ''; });
      en.addEventListener('blur', function () { const n = normalizeTime(en.value); en.value = n || ''; it.end = n || ''; });
      const cross = $('.te-cross', node), noti = $('.te-notify', node);
      cross.setAttribute('aria-pressed', it.crossDay ? 'true' : 'false');
      noti.setAttribute('aria-pressed', it.notify !== false ? 'true' : 'false');
      cross.addEventListener('click', function () {
        it.crossDay = !it.crossDay; dirty = true;
        cross.setAttribute('aria-pressed', it.crossDay ? 'true' : 'false');
      });
      noti.addEventListener('click', function () {
        it.notify = !(it.notify !== false); dirty = true;
        noti.setAttribute('aria-pressed', it.notify ? 'true' : 'false');
      });
      if (!Array.isArray(it.tplIds)) it.tplIds = [];
      const tplsBox = $('.te-tpls', node);
      if (data.templates.length) {
        data.templates.forEach(function (t) {
          const c = mk('tpl-chip');
          c.textContent = t.name;
          c.setAttribute('aria-pressed', it.tplIds.indexOf(t.id) >= 0 ? 'true' : 'false');
          c.addEventListener('click', function () {
            const ix = it.tplIds.indexOf(t.id);
            if (ix >= 0) it.tplIds.splice(ix, 1); else it.tplIds.push(t.id);
            dirty = true;
            c.setAttribute('aria-pressed', ix >= 0 ? 'false' : 'true');
          });
          tplsBox.appendChild(c);
        });
      } else {
        const e = document.createElement('span');
        e.className = 'section-note';
        e.textContent = '还没有模板,先在「管理模板」新建';
        tplsBox.appendChild(e);
      }
      $('.te-del', node).addEventListener('click', function () { items.splice(idx, 1); dirty = true; paint(); });
      listBox.appendChild(node);
    });
  }
  addBtn.addEventListener('click', function () {
    items.push({ id: uid(), start: '', end: '', task: '', desc: '', crossDay: false, notify: true, done: null, tplIds: [] });
    dirty = true; paint();
    const nodes = $$('.te-task', listBox);
    if (nodes.length) { try { nodes[nodes.length - 1].focus({ preventScroll: false }); } catch (e) {} }
  });
  const footNode = document.createElement('div');
  footNode.className = 'btn-row';
  const cancel = document.createElement('button');
  cancel.type = 'button'; cancel.className = 'btn'; cancel.textContent = '取消';
  cancel.addEventListener('click', function () { Sheet.requestClose(); });
  const ok = document.createElement('button');
  ok.type = 'button'; ok.className = 'btn btn-primary'; ok.textContent = '保存时间线';
  ok.addEventListener('click', function () {
    const cleaned = items.map(function (i) {
      return {
        id: i.id || uid(), start: normalizeTime(i.start) || '', end: normalizeTime(i.end) || '',
        task: String(i.task || '').trim(), desc: String(i.desc || '').trim(),
        crossDay: !!i.crossDay, notify: i.notify !== false, done: i.done || null,
        tplIds: Array.isArray(i.tplIds) ? i.tplIds.slice() : []
      };
    }).filter(function (i) { return i.task || i.start; });
    const bad = cleaned.filter(function (i) { return !i.start || !i.task; });
    if (bad.length) { toast('有 ' + bad.length + ' 个任务缺少名称或开始时间'); return; }
    data.timeline = cleaned;
    if (data.reminderLog.date !== todayStr()) data.reminderLog = { date: todayStr(), ids: [] };
    dirty = false;
    save(); Sheet.closeNow(); renderTimeline(true);
    toast(cleaned.length ? '已保存 ' + cleaned.length + ' 个任务' : '时间线已清空');
  });
  footNode.appendChild(cancel); footNode.appendChild(ok);
  paint();
  Sheet.open({
    title: '管理时间线', bodyNode: bodyNode, footNode: footNode,
    dirty: function () { return dirty; },
    onClose: function () { dirty = false; }
  });
}



export const Reminder = (function () {
  let titleTimer = null;
  const origTitle = document.title;
  function banner(title, desc) {
    const b = $('#alertBanner');
    $('#alertTitle').textContent = title;
    $('#alertDesc').textContent = desc;
    b.classList.add('show');
    clearTimeout(b._t);
    b._t = setTimeout(function () { b.classList.remove('show'); }, 12000);
  }
  function flashTitle(text) {
    if (titleTimer) return;
    let on = false;
    titleTimer = setInterval(function () {
      document.title = on ? origTitle : ('🔔 ' + text);
      on = !on;
    }, 1000);
  }
  function stopFlash() {
    if (titleTimer) { clearInterval(titleTimer); titleTimer = null; document.title = origTitle; }
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      stopFlash();
      check(true);
      lastRefreshMin = -1;          // 回到前台立即校准一次时间
      refreshDatetimeFields();
    }
  });
  $('#alertClose').addEventListener('click', function () { $('#alertBanner').classList.remove('show'); stopFlash(); });
  function ensureLog() {
    if (!data.reminderLog || data.reminderLog.date !== todayStr()) data.reminderLog = { date: todayStr(), ids: [] };
    return data.reminderLog;
  }
  function fire(item, nowMin) {
    const log = ensureLog();
    if (log.ids.indexOf(item.id) >= 0) return;
    log.ids.push(item.id);
    save();
    const range = item.end ? (item.start + ' - ' + item.end) : item.start;
    if (!data.settings.notify.enabled) return;
    banner('任务提醒 · ' + range, item.task + (item.desc ? '|' + item.desc : ''));
    if (Caps.notify && Caps.notifyPerm() === 'granted') {
      try {
        const n = new Notification('任务提醒 · ' + range, { body: item.task + (item.desc ? '\n' + item.desc : ''), tag: item.id, requireInteraction: false });
        n.onclick = function () { window.focus(); try { n.close(); } catch (e) {} };
      } catch (e) {}
    }
    if (Caps.vibrate && data.settings.notify.vibrate) { try { navigator.vibrate([220, 110, 220]); } catch (e) {} }
    Sound.beep(2);
    if (document.hidden) flashTitle(item.task || '任务提醒');
  }
  function check(catchUp) {
    if (!data.settings.notify.enabled) return;
    const d = new Date();
    const nowMin = d.getHours() * 60 + d.getMinutes();
    const adv = parseInt(data.settings.notify.advanceMin, 10) || 0;
    const log = ensureLog();
    data.timeline.forEach(function (item) {
      if (item.notify === false) return;
      const w = itemWindow(item);
      if (!w) return;
      const trigger = ((w[0] - adv) % 1440 + 1440) % 1440;
      const hit = nowMin === trigger || (catchUp && nowMin >= trigger && nowMin <= Math.min(trigger + 5, w[0] % 1440));
      if (hit && log.ids.indexOf(item.id) < 0) fire(item, nowMin);
    });
  }
  function askPermission() {
    if (!Caps.notify) { toast('当前环境不支持系统通知(需 https 或本地服务器打开)'); return; }
    const p = Caps.notifyPerm();
    if (p === 'granted') { toast('通知权限已开启'); return; }
    if (p === 'denied') { toast('通知权限已被拒绝,请在浏览器设置中手动开启'); return; }
    Notification.requestPermission().then(function (r) {
      toast(r === 'granted' ? '通知权限已开启,到点会弹通知' : '未获得通知权限,将只用页面内提醒');
      renderRemindBar();
    }).catch(function () { toast('无法申请通知权限'); });
  }
  function start() {
    setInterval(function () {
      tickClock();
      const d = new Date();
      if (d.getSeconds() % 15 === 0) { check(false); renderTimeline(false); }
      maybeRefreshDatetime();        // 跨分钟/跨天自动校准
    }, 1000);
    check(true);
  }
  return { start, check, askPermission, banner };
})();

export function renderRemindBar() {
  const box = $('#remindBar');
  box.innerHTML = '';
  const node = mk('tpl-remind-bar');
  const txt = $('.rb-text', node), btn = $('.rb-btn', node);
  let okState = false, msg = '';
  if (!data.settings.notify.enabled) {
    msg = '提醒已关闭,到点不会有任何提示';
    btn.hidden = false; btn.textContent = '开启';
    btn.addEventListener('click', function () { data.settings.notify.enabled = true; save(); renderRemindBar(); bus.emit('refresh'); });
  } else if (!Caps.notify) {
    msg = Caps.secure ? '浏览器不支持系统通知,将用页面内横幅 + 提示音 + 震动提醒' : '以本地文件方式打开时浏览器禁用系统通知,将用页面内横幅 + 提示音提醒;把页面放到 https 环境可获得系统通知';
    okState = false;
  } else if (Caps.notifyPerm() === 'granted') {
    msg = '系统通知已开启,任务到点会弹通知并震动';
    okState = true;
  } else if (Caps.notifyPerm() === 'denied') {
    msg = '系统通知被拒绝,将用页面内提醒;可在浏览器设置中恢复权限';
  } else {
    msg = '开启系统通知后,切到其他 App 也能收到任务提醒';
    btn.hidden = false; btn.textContent = '开启通知';
    btn.addEventListener('click', function () { Reminder.askPermission(); });
  }
  txt.textContent = msg;
  node.className = 'remind-bar' + (okState ? ' ok' : '');
  box.appendChild(node);
}


export function renderTodo(list, nowMin, doneCount) {
  const body = $('#todoBody');
  if (!body) return;
  body.innerHTML = '';
  const cnt = $('#todoCount');
  if (cnt) cnt.textContent = '已完成 ' + doneCount + ' / ' + list.length;
  if (!list.length) {
    const e = document.createElement('div'); e.className = 'section-note'; e.textContent = '今天没有安排任务,点下方「管理任务」添加每日流程。';
    body.appendChild(e); return;
  }
  function addLine(tag, cls, text, strong) {
    const row = document.createElement('div'); row.className = 'todo-line';
    const t = document.createElement('span'); t.className = 'todo-tag ' + cls; t.textContent = tag;
    const c = document.createElement('span'); c.style.cssText = 'flex:1;min-width:0';
    if (strong) { const b = document.createElement('b'); b.textContent = text; c.appendChild(b); }
    else c.textContent = text;
    row.appendChild(t); row.appendChild(c); body.appendChild(row);
  }
  const current = list.filter(function (i) { return statusOf(i, nowMin) === 'current' && !isDoneToday(i); });
  const late = list.filter(function (i) { return statusOf(i, nowMin) === 'past' && !isDoneToday(i); });
  const future = list.filter(function (i) { return statusOf(i, nowMin) === 'future'; });
  if (current.length) current.forEach(function (i) { addLine('现在', 'now', i.task + (i.end ? '(至 ' + i.end + ')' : ''), true); });
  else addLine('现在', 'now', '当前无进行中任务', false);
  if (future.length) addLine('接下来', 'next', future[0].start + ' ' + future[0].task, false);
  if (late.length) addLine('逾期未完成', 'late', late.map(function (i) { return i.task; }).join('、'), true);
  if (doneCount === list.length) addLine('状态', 'done', '今日任务已全部完成', false);
}

export function bindTimeline() {
  $('#btnManageTimeline').addEventListener('click', openTimelineSheet);
}
