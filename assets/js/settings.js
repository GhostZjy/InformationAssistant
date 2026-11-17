import { $, $$, Caps, bus, debounce, el, mk, toast, uid } from './core.js';
import { renderForm, renderPreview } from './report.js';
import { data, exportJSON, importFromFile, openBackupSheet, openImportSheet, save, wipeData } from './store.js';
import { Sheet, Sound } from './ui.js';

export function applyTheme() {
  const pref = data.settings.theme || 'auto';
  let dark = false;
  if (pref === 'dark') dark = true;
  else if (pref === 'light') dark = false;
  else dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const icon = $('#iconTheme');
  const svgNS = 'http://www.w3.org/2000/svg';
  icon.textContent = '';
  if (dark) {
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('d', 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z');
    icon.appendChild(p);
  } else {
    const c = document.createElementNS(svgNS, 'circle');
    c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '4');
    icon.appendChild(c);
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('d', 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4');
    icon.appendChild(p);
  }
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  if (metas.length) metas[0].setAttribute('content', dark ? '#0d1117' : '#4f7cf7');
}

export function renderThemeChips() {
  const box = $('#themeChips');
  box.innerHTML = '';
  [['auto', '跟随系统'], ['light', '浅色'], ['dark', '深色']].forEach(function (p) {
    const c = mk('tpl-chip');
    c.textContent = p[1];
    c.setAttribute('aria-pressed', (data.settings.theme || 'auto') === p[0] ? 'true' : 'false');
    c.addEventListener('click', function () {
      data.settings.theme = p[0];
      save(); applyTheme(); renderThemeChips();
    });
    box.appendChild(c);
  });
}

export function switchRow(host, title, desc, checked, onChange) {
  const row = document.createElement('div');
  row.className = 'switch-row';
  const wrap = document.createElement('div');
  wrap.className = 'sw-text';
  const t = document.createElement('div');
  t.className = 'sw-title'; t.textContent = title;
  wrap.appendChild(t);
  if (desc) { const d = document.createElement('div'); d.className = 'sw-desc'; d.textContent = desc; wrap.appendChild(d); }
  const sw = document.createElement('button');
  sw.type = 'button'; sw.className = 'switch'; sw.setAttribute('role', 'switch');
  sw.setAttribute('aria-checked', checked ? 'true' : 'false');
  sw.setAttribute('aria-label', title);
  sw.addEventListener('click', function () {
    const next = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', next ? 'true' : 'false');
    onChange(next);
  });
  row.appendChild(wrap); row.appendChild(sw);
  host.appendChild(row);
  return sw;
}

export function renderNotifySettings() {
  const box = $('#notifySettings');
  box.innerHTML = '';
  const n = data.settings.notify;
  switchRow(box, '任务提醒', '到点自动提示,需要页面保持打开', n.enabled, function (v) { n.enabled = v; save(); bus.emit('refresh'); renderNotifySettings(); });
  switchRow(box, '提示音', '浏览器合成音,不需要音频文件', n.sound, function (v) { n.sound = v; save(); if (v) Sound.beep(1); });
  switchRow(box, '震动', Caps.vibrate ? '仅手机且浏览器支持时生效' : '当前浏览器不支持震动', n.vibrate, function (v) { n.vibrate = v; save(); if (v && Caps.vibrate) { try { navigator.vibrate(120); } catch (e) {} } });
  const adv = document.createElement('div');
  adv.className = 'field';
  adv.style.marginTop = '12px';
  const lab = document.createElement('div');
  lab.className = 'field-label';
  const span = document.createElement('span');
  span.className = 'fl-name';
  span.textContent = '提前提醒(分钟)';
  lab.appendChild(span);
  adv.appendChild(lab);
  const st = document.createElement('div');
  st.className = 'stepper';
  const minus = document.createElement('button');
  minus.type = 'button'; minus.className = 'stepper-btn'; minus.textContent = '-';
  minus.setAttribute('aria-label', '减少提前分钟');
  const inp = document.createElement('input');
  inp.className = 'stepper-input'; inp.type = 'number'; inp.min = '0'; inp.max = '30';
  inp.value = String(parseInt(n.advanceMin, 10) || 0);
  inp.setAttribute('aria-label', '提前提醒分钟数');
  const plus = document.createElement('button');
  plus.type = 'button'; plus.className = 'stepper-btn'; plus.textContent = '+';
  plus.setAttribute('aria-label', '增加提前分钟');
  st.appendChild(minus); st.appendChild(inp); st.appendChild(plus);
  adv.appendChild(st);
  const setAdv = function (v) {
    v = Math.min(30, Math.max(0, isNaN(v) ? 0 : v));
    n.advanceMin = v; inp.value = String(v); save();
  };
  minus.addEventListener('click', function () { setAdv((parseInt(inp.value, 10) || 0) - 1); });
  plus.addEventListener('click', function () { setAdv((parseInt(inp.value, 10) || 0) + 1); });
  inp.addEventListener('change', function () { setAdv(parseInt(inp.value, 10)); });
  inp.addEventListener('blur', function () { setAdv(parseInt(inp.value, 10)); });
  box.appendChild(adv);
  if (!Caps.notify) {
    const p = document.createElement('p');
    p.className = 'section-note';
    p.style.marginTop = '10px';
    p.textContent = Caps.secure ? '当前浏览器不支持系统通知,提醒以页面内横幅、提示音和震动为主。' : '当前以本地文件方式打开,浏览器会禁用系统通知与震动。把本页放到 https 环境(或本地服务器)后即可获得系统通知,页面本身不需要改动。';
    box.appendChild(p);
  }
}

export function renderCaps() {
  const box = $('#capGrid');
  box.innerHTML = '';
  Caps.label().forEach(function (c) {
    const node = mk('tpl-cap-item');
    node.className = 'cap-item ' + (c.ok ? 'yes' : 'no');
    $('.cap-name', node).textContent = c.name;
    box.appendChild(node);
  });
  $('#capNote').textContent = Caps.secure
    ? '当前为安全上下文,系统能力基本可用。'
    : '当前通过本地文件或非加密地址打开,浏览器会禁用系统通知、震动等能力。部署到任意 https 静态空间后这些能力会自动开启。';
}

export function bindRows(host, arr, opt) {
  host.innerHTML = '';
  if (!arr.length) {
    const e = document.createElement('div');
    e.className = 'section-note';
    e.style.padding = '6px 0';
    e.textContent = opt.emptyText || '还没有内容,点上方「添加」';
    host.appendChild(e);
    return;
  }
  arr.forEach(function (val, idx) {
    const node = mk('tpl-row-input');
    const input = $('.ri-input', node);
    input.value = val;
    input.placeholder = opt.placeholder || '';
    input.setAttribute('aria-label', (opt.label || '项目') + ' ' + (idx + 1));
    input.addEventListener('input', function () { arr[idx] = input.value; opt.onChange(false); });
    input.addEventListener('blur', function () {
      if (!input.value.trim()) { arr.splice(idx, 1); opt.onChange(true); }
    });
    const up = $('.ri-up', node), down = $('.ri-down', node);
    up.disabled = idx === 0; down.disabled = idx === arr.length - 1;
    up.addEventListener('click', function () { const t = arr[idx - 1]; arr[idx - 1] = arr[idx]; arr[idx] = t; opt.onChange(true); });
    down.addEventListener('click', function () { const t = arr[idx + 1]; arr[idx + 1] = arr[idx]; arr[idx] = t; opt.onChange(true); });
    $('.ri-del', node).addEventListener('click', function () { arr.splice(idx, 1); opt.onChange(true); });
    host.appendChild(node);
  });
}

export function renderEntrances() {
  bindRows($('#entranceList'), data.settings.entrances, {
    placeholder: '如 A口 / 1号安检点', label: '安检点', emptyText: '还没有安检点,添加后可在模板里用 *安检点* 生成下拉选择',
    onChange: function (repaint) { save(); if (repaint) renderEntrances(); renderForm(); }
  });
}

export function renderGroups() {
  bindRows($('#groupList'), data.settings.groups, {
    placeholder: '如 安检工作群 / 应急处置群', label: '群名', emptyText: '还没有群名,添加后可在模板管理里为模板选择发往哪个群',
    onChange: function (repaint) { save(); if (repaint) renderGroups(); }
  });
}

export function renderMembers() {
  const host = $('#memberList');
  host.innerHTML = '';
  if (!data.settings.members.length) {
    const e = document.createElement('div');
    e.className = 'section-note';
    e.style.padding = '6px 0';
    e.textContent = '还没有人员,可以点上方「批量导入」一次粘贴一整份名单,或用「添加」逐个录入。';
    host.appendChild(e);
    return;
  }
  data.settings.members.forEach(function (m, idx) {
    const row = document.createElement('div');
    row.className = 'list-row';
    const nameInp = document.createElement('input');
    nameInp.className = 'input';
    nameInp.type = 'text';
    nameInp.value = m.name || '';
    nameInp.placeholder = '姓名';
    nameInp.style.flex = '1';
    nameInp.style.minHeight = '40px';
    nameInp.setAttribute('aria-label', '人员 ' + (idx + 1) + ' 姓名');
    nameInp.addEventListener('input', function () { m.name = nameInp.value; save(); });
    const idInp = document.createElement('input');
    idInp.className = 'input';
    idInp.type = 'text';
    idInp.value = m.id || '';
    idInp.placeholder = '工号';
    idInp.style.flex = '1';
    idInp.style.minHeight = '40px';
    idInp.setAttribute('aria-label', '人员 ' + (idx + 1) + ' 工号');
    idInp.addEventListener('input', function () { m.id = idInp.value; save(); });
    const up = document.createElement('button');
    up.type = 'button'; up.className = 'mini-btn'; up.textContent = '↑';
    up.disabled = idx === 0;
    up.setAttribute('aria-label', '上移');
    up.addEventListener('click', function () {
      if (idx > 0) {
        const t = data.settings.members[idx - 1];
        data.settings.members[idx - 1] = data.settings.members[idx];
        data.settings.members[idx] = t;
        save(); renderMembers(); renderForm();
      }
    });
    const down = document.createElement('button');
    down.type = 'button'; down.className = 'mini-btn'; down.textContent = '↓';
    down.disabled = idx === data.settings.members.length - 1;
    down.setAttribute('aria-label', '下移');
    down.addEventListener('click', function () {
      if (idx < data.settings.members.length - 1) {
        const t = data.settings.members[idx + 1];
        data.settings.members[idx + 1] = data.settings.members[idx];
        data.settings.members[idx] = t;
        save(); renderMembers(); renderForm();
      }
    });
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'mini-btn danger';
    del.textContent = '删除';
    del.setAttribute('aria-label', '删除人员');
    del.addEventListener('click', function () {
      data.settings.members.splice(idx, 1);
      save(); renderMembers(); renderForm();
    });
    row.appendChild(nameInp);
    row.appendChild(idInp);
    row.appendChild(up);
    row.appendChild(down);
    row.appendChild(del);
    host.appendChild(row);
  });
}
/* 解析批量粘贴的人员名单:支持 空格、逗号、制表符、分号、竖线、括号 等分隔 */

export function parseMembersText(raw) {
  const out = [];
  const lines = String(raw || '').split(/\r?\n/);
  lines.forEach(function (line) {
    let s = line.trim();
    if (!s) return;
    // 去掉行首序号,如 "1. " "1、" "1) " "1：" 以及 "- " "* " "· " "• "
    s = s.replace(/^\d+\s*[.、)）:：]\s*/, '').replace(/^[-*·•]\s*/, '');
    if (!s) return;
    let name = '', id = '';
    const mb = s.match(/^(.+?)\s*[（(]\s*([^)）]*?)\s*[)）]\s*$/);
    if (mb) {
      name = mb[1].trim();
      id = mb[2].trim();
    } else {
      const m1 = s.match(/^(.+?)\s*[,，\t;；|]\s*(.+)$/);
      if (m1) {
        name = m1[1].trim();
        id = m1[2].trim();
      } else {
        const parts = s.split(/\s+/);
        if (parts.length >= 2) {
          id = parts.pop();
          name = parts.join(' ').trim();
        } else {
          name = s;
        }
      }
    }
    // 智能识别:如果"姓名"是纯数字而"工号"不是,交换
    if (name && id && /^\d+$/.test(name) && !/^\d+$/.test(id)) {
      const t = name; name = id; id = t;
    }
    if (name) out.push({ name: name, id: id });
  });
  return out;
}

export function openMemberImportSheet() {
  const bodyNode = document.createElement('div');

  const tip = document.createElement('p');
  tip.className = 'section-note';
  tip.style.marginBottom = '9px';
  tip.style.lineHeight = '1.9';
  tip.innerHTML = '每行一个人员,支持以下写法(可混用,自动识别):<br>'
    + '<code>张三 001</code> &nbsp; <code>张三,001</code> &nbsp; <code>张三，001</code><br>'
    + '<code>张三（001）</code> &nbsp; <code>张三(001)</code> &nbsp; <code>张三</code><br>'
    + '行首序号会忽略,例如 <code>1. 张三 001</code>';
  bodyNode.appendChild(tip);

  const ta = document.createElement('textarea');
  ta.className = 'textarea';
  ta.style.minHeight = '180px';
  ta.style.fontFamily = 'ui-monospace,SFMono-Regular,Menlo,monospace';
  ta.style.fontSize = '14px';
  ta.placeholder = '张三 001\n李四 002\n王五,003\n赵六（004）\n孙七';
  ta.setAttribute('aria-label', '人员名单');
  bodyNode.appendChild(ta);

  const preview = document.createElement('div');
  preview.className = 'preview';
  preview.style.marginTop = '9px';
  preview.style.minHeight = '56px';
  preview.style.fontSize = '.82rem';
  preview.style.maxHeight = '180px';
  preview.style.overflow = 'auto';
  bodyNode.appendChild(preview);

  const footNode = document.createElement('div');
  footNode.className = 'btn-row';

  const replaceBtn = document.createElement('button');
  replaceBtn.type = 'button';
  replaceBtn.className = 'btn btn-danger';
  replaceBtn.textContent = '替换全部';

  const appendBtn = document.createElement('button');
  appendBtn.type = 'button';
  appendBtn.className = 'btn btn-primary';
  appendBtn.textContent = '追加到现有';

  function getParsed() { return parseMembersText(ta.value); }

  function updatePreview() {
    const list = getParsed();
    if (!list.length) {
      preview.classList.add('placeholder');
      preview.textContent = '还没有解析到人员,把名单粘到上面的输入框';
      appendBtn.disabled = true;
      replaceBtn.disabled = true;
      appendBtn.textContent = '追加到现有';
      replaceBtn.textContent = '替换全部';
      return;
    }
    preview.classList.remove('placeholder');
    preview.textContent = '';
    const head = document.createElement('div');
    head.style.cssText = 'font-weight:700;color:var(--primary);margin-bottom:6px';
    head.textContent = '共解析到 ' + list.length + ' 名人员：';
    preview.appendChild(head);
    const showAll = document.createElement('div');
    showAll.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px';
    list.forEach(function (m) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.style.cssText = 'font-size:.72rem;min-height:26px;padding:2px 8px;pointer-events:none';
      chip.textContent = m.name + (m.id ? '（' + m.id + '）' : '');
      showAll.appendChild(chip);
    });
    preview.appendChild(showAll);
    appendBtn.disabled = false;
    replaceBtn.disabled = false;
    appendBtn.textContent = '追加 ' + list.length + ' 人';
    replaceBtn.textContent = '替换为 ' + list.length + ' 人';
  }

  ta.addEventListener('input', debounce(updatePreview, 120));

  appendBtn.addEventListener('click', function () {
    const list = getParsed();
    if (!list.length) return;
    const existing = {};
    data.settings.members.forEach(function (m) {
      existing[(m.name || '') + '\u0000' + (m.id || '')] = 1;
    });
    let added = 0, skipped = 0;
    list.forEach(function (m) {
      const k = m.name + '\u0000' + m.id;
      if (existing[k]) { skipped++; return; }
      existing[k] = 1;
      data.settings.members.push(m);
      added++;
    });
    save(); renderMembers(); renderForm();
    Sheet.closeNow();
    if (added && skipped) toast('已追加 ' + added + ' 人,跳过 ' + skipped + ' 个重复');
    else if (added) toast('已追加 ' + added + ' 名人员');
    else toast('全部 ' + skipped + ' 人都已存在,未新增');
  });

  replaceBtn.addEventListener('click', function () {
    const list = getParsed();
    if (!list.length) return;
    const current = data.settings.members.length;
    if (!current) {
      data.settings.members = list;
      save(); renderMembers(); renderForm();
      Sheet.closeNow();
      toast('已导入 ' + list.length + ' 名人员');
      return;
    }
    Sheet.confirmSheet({
      title: '替换全部人员？',
      message: '当前的 ' + current + ' 名人员会被替换为新的 ' + list.length + ' 名,此操作不可撤销。',
      okText: '确认替换',
      danger: true,
      detail: list.slice(0, 20).map(function (m) { return m.name + (m.id ? '（' + m.id + '）' : ''); }).join('、') + (list.length > 20 ? ' 等 ' + list.length + ' 人' : ''),
      onOk: function () {
        data.settings.members = list;
        save(); renderMembers(); renderForm();
        Sheet.closeNow();
        toast('已替换为 ' + list.length + ' 名人员');
      }
    });
  });

  footNode.appendChild(replaceBtn);
  footNode.appendChild(appendBtn);

  updatePreview();
  Sheet.open({
    title: '批量导入人员',
    bodyNode: bodyNode,
    footNode: footNode,
    autofocus: true
  });
}

export function renderDispatch() {
  bindRows($('#dispatchList'), data.settings.dispatchOptions, {
    placeholder: '如 劝导自弃后进站', label: '处置方式', emptyText: '还没有处置方式',
    onChange: function (repaint) { save(); if (repaint) renderDispatch(); renderForm(); }
  });
}

export function renderCustom() {
  const host = $('#customList');
  host.innerHTML = '';
  if (!data.settings.custom.length) {
    const e = document.createElement('div');
    e.className = 'section-note';
    e.style.padding = '6px 0';
    e.textContent = '还没有自定义变量。例如加一个「天气」,类型选单选,选项填 晴|雨|雪,模板里写 *天气* 就会生成一组可点的按钮。';
    host.appendChild(e);
    return;
  }
  data.settings.custom.forEach(function (c, idx) {
    const node = mk('tpl-row-custom');
    $('.di-title', node).textContent = '变量 ' + (idx + 1);
    const key = $('.rc-key', node), type = $('.rc-type', node), val = $('.rc-value', node), hint = $('.rc-hint', node);
    key.value = c.key || '';
    type.value = ['text', 'single', 'multi', 'number'].indexOf(c.type) >= 0 ? c.type : 'text';
    val.value = c.value || '';
    function syncHint() {
      const t = type.value;
      if (t === 'text') { val.placeholder = '固定值'; hint.hidden = true; }
      else if (t === 'number') { val.placeholder = '默认数字,如 0'; hint.hidden = true; }
      else {
        val.placeholder = '选项1|选项2|选项3';
        hint.hidden = false;
        hint.textContent = t === 'single' ? '单选:上报页显示为一组可点按钮,选一个' : '多选:可点选多个,用「、」连接';
      }
    }
    syncHint();
    key.addEventListener('input', function () { c.key = key.value.trim(); save(); });
    type.addEventListener('change', function () { c.type = type.value; save(); syncHint(); renderForm(); });
    val.addEventListener('input', function () { c.value = val.value; save(); renderForm(); });
    $('.rc-del', node).addEventListener('click', function () {
      data.settings.custom.splice(idx, 1);
      save(); renderCustom(); renderForm(); toast('已删除');
    });
    host.appendChild(node);
  });
}

export function renderHeaderSub() {
  const s = data.settings;
  const bits = [s.line, s.station].filter(function (x) { return (x || '').trim(); });
  $('#headerSub').textContent = bits.length ? bits.join(' · ') : '未设置线路站点,去「设置」里填写';
}

export function renderSettingsAll() {
  const s = data.settings;
  $('#setLine').value = s.line || '';
  $('#setStation').value = s.station || '';
  $('#setLeader').value = s.leader || '';
  $('#setLeaderPhone').value = s.leaderPhone || '';
  renderEntrances(); renderGroups(); renderMembers(); renderCustom(); renderDispatch();
  renderThemeChips(); renderNotifySettings(); renderCaps();
  $('#aboutText').textContent = '信息助手 v5 · 单文件离线应用,无网络请求、无第三方依赖,全部数据只保存在这台设备的浏览器本地存储中。当前有 '
    + data.templates.length + ' 个模板、' + data.timeline.length + ' 个时间线任务、' + data.history.length
    + ' 条上报记录。清除浏览器数据会一并删除,建议定期「导出配置」备份。速查页内容可自定义,正式认定以运营单位现行文件为准。';
}

export function bindSettingsInputs() {
  const map = { setLine: 'line', setStation: 'station', setLeader: 'leader', setLeaderPhone: 'leaderPhone' };
  Object.keys(map).forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    const key = map[id];
    const write = debounce(function () {
      data.settings[key] = el.value.trim();
      save(); renderHeaderSub(); renderForm(); renderPreview();
    }, 260);
    el.addEventListener('input', function () { data.settings[key] = el.value; write(); });
    el.addEventListener('blur', function () {
      data.settings[key] = el.value.trim();
      el.value = data.settings[key];
      save(); renderHeaderSub(); renderForm(); renderPreview();
    });
  });
}

export function bindCollapse() {
  const COL_KEY = 'infoAssistant.v5.collapse';
  let state = {};
  try { state = JSON.parse(localStorage.getItem(COL_KEY) || '{}') || {}; } catch (e) { state = {}; }
  function saveState() {
    try { localStorage.setItem(COL_KEY, JSON.stringify(state)); } catch (e) {}
  }
  $$('.card-collapsible').forEach(function (card) {
    const key = card.getAttribute('data-collapse');
    const toggle = $('.collapse-toggle', card);
    if (!toggle) return;
    function setState(collapsed) {
      card.classList.toggle('collapsed', collapsed);
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
    setState(!!state[key]);
    toggle.addEventListener('click', function () {
      const collapsed = !card.classList.contains('collapsed');
      state[key] = collapsed;
      setState(collapsed);
      saveState();
    });
  });
}



export function openHelpSheet() {
  const node = document.createElement('div');
  const blocks = [
    { t: '快速上手', l: ['在「上报」页的竖向列表里选模板,模板多时可用上方搜索框过滤', '预览区实时生成完整文本', '点「复制结果」直接粘贴到微信发送',
      '有变量没填时会先列出漏填项让你确认,可以选择返回填写或仍要复制', '时间、日期类变量每次打开自动填当前时刻,不用手动删除'] },
    { t: '模板语法', l: ['*变量名* 会生成对应输入框', '*日期* 自动填当天(如 2026年10月2日)', '含「时间」的变量自动填当前时间,支持 08:30、8.30、830 等写法', '{?备注}备注:*备注*{/备注} 表示变量为空时整段不输出', '在「管理模板 → 变量与类型」里可把变量改成单选、多选、数字、物品清单'] },
    { t: '发往群名', l: ['在设置页的「发往群名」里添加你常用的群', '在模板管理里为每个模板选择发往哪些群(可多选)', '上报页会显示提示条,点「复制群名」一键复制所有选中的群'] },
    { t: '时间线', l: ['管理每日任务,到点提醒', '支持跨天夜班,例如 22:00 - 02:00,编辑时勾选「跨天夜班」', '左侧圆圈可勾选完成,会记录实际完成时间', '系统通知需要 https 环境并授权;本地文件打开时用页面内横幅加提示音提醒'] },
    { t: '人员批量导入', l: ['设置页「人员」卡片右上角点「批量导入」', '支持「张三 001」「张三,001」「张三（001）」等多种写法,一行一个', '可先「追加到现有」(自动跳过重复),或「替换全部」', '一键粘贴微信、Excel 里复制出来的名单即可'] },
    { t: '速查', l: ['速查内容随配置文件下发,在「设置 → 导入配置」导入即可载入', '分类含 A/B 类图像特征、禁止携带、限制携带、处置口径、汇报口径、勤务考勤、奖惩分值、考点速记、便民信息', '顶部搜索框可查物品名、数值和口径,命中的卡片自动展开',
      'A/B 类物品卡片展开后可点「用这条上报」,直接带物品名进查危简报', '也可以在设置页「速查内容 → 管理」里自行添加、编辑、排序'] },
    { t: '制作模板', l: ['上报页点「制作模板」,把一段已经写好的上报文本粘进去', '点「识别可替换内容」,工具会标出日期、时间、线路、站点、安检点、人员、物品、数量等候选', '每处可以改变量名和类型、取消替换、或只替换第一处', '识别不到的可在「手动补选」里填原文片段和变量名', '生成结果可继续手动修改,填好名称分组后保存即成新模板', '历史记录每条也有「转模板」,可直接拿旧上报内容做模板'] },
    { t: '历史复用', l: ['复制上报时会把当时各变量的取值一并存进历史', '点「复用」优先直接用这份取值回填,日期时间自动更新为当前', '旧记录没有取值时,按模板结构反解文本;再对不上就回落上次填写内容'] },
    { t: '物品输入与速查联动', l: ['违禁品/限带品字段输入时从速查实时给候选,点选即填,也能手输速查里没有的', '速查页 A/B 类卡片展开后有「用这条上报」,自动跳进对应查危简报并填好物品名'] },
    { t: '今日待办', l: ['时间线页顶部显示现在该做哪件、接下来哪件、哪些到点还没勾完成', '不依赖系统通知,打开页面就能看清,离线可用'] },
    { t: '数据统计', l: ['物品清单类型支持自定义字段,可配置「数字」类型并勾选「求和」自动汇总', '字段可关联「安检点」或「群名」,填数据时直接下拉选择不用手输', '模板里用 *总字段名* 引用汇总值,如 *总过机数*'] },
    { t: '数据与备份', l: ['全部数据只存在这台设备的浏览器里,不上传', '每天首次打开自动备份一份快照,保留最近 7 份,「备份与恢复」可一键回滚', '也可手动立即备份、导出 .json 发给同事', '导入分两种:整包覆盖全部数据;合并导入只并入模板/速查(同名覆盖),不动历史与设置', '清除浏览器数据会一并删除,请定期备份'] }
  ];
  blocks.forEach(function (b) {
    const title = document.createElement('div');
    title.className = 'set-title';
    title.textContent = b.t;
    node.appendChild(title);
    const ul = document.createElement('ul');
    b.l.forEach(function (line) {
      const li = document.createElement('li');
      li.style.cssText = 'position:relative;padding-left:14px;margin-bottom:6px;font-size:.85rem;color:var(--text-2);line-height:1.7';
      li.textContent = line;
      ul.appendChild(li);
    });
    node.appendChild(ul);
  });
  const footNode = document.createElement('div');
  const ok = document.createElement('button');
  ok.type = 'button'; ok.className = 'btn btn-primary btn-block'; ok.textContent = '知道了';
  ok.addEventListener('click', function () { Sheet.closeNow(); });
  footNode.appendChild(ok);
  Sheet.open({ title: '使用说明', bodyNode: node, footNode: footNode, autofocus: false });
}



export function bindSettings() {
  const themeNames = { auto: '跟随系统', light: '浅色', dark: '深色' };
  $('#btnTheme').addEventListener('click', function () {
    const order = ['auto', 'light', 'dark'];
    const cur = data.settings.theme || 'auto';
    data.settings.theme = order[(order.indexOf(cur) + 1) % order.length];
    save(); applyTheme(); renderThemeChips();
    toast('主题:' + themeNames[data.settings.theme]);
  });
  $('#btnHelp').addEventListener('click', openHelpSheet);
  $('#btnImportMembers').addEventListener('click', openMemberImportSheet);
  $('#btnAddEntrance').addEventListener('click', function () {
    data.settings.entrances.push(''); save(); renderEntrances();
    const rows = $$('#entranceList input'); if (rows.length) { try { rows[rows.length - 1].focus(); } catch (e) {} }
  });
  $('#btnAddGroup').addEventListener('click', function () {
    data.settings.groups.push(''); save(); renderGroups();
    const rows = $$('#groupList input'); if (rows.length) { try { rows[rows.length - 1].focus(); } catch (e) {} }
  });
  $('#btnAddMember').addEventListener('click', function () {
    data.settings.members.push({ name: '', id: '' }); save(); renderMembers();
    const rows = $$('#memberList input'); if (rows.length) { try { rows[rows.length - 2].focus(); } catch (e) {} }
  });
  $('#btnAddDispatch').addEventListener('click', function () { data.settings.dispatchOptions.push(''); save(); renderDispatch(); });
  $('#btnAddCustom').addEventListener('click', function () { data.settings.custom.push({ id: uid(), key: '', type: 'text', value: '' }); save(); renderCustom(); });
  $('#btnExport').addEventListener('click', exportJSON);
  $('#btnImport').addEventListener('click', openImportSheet);
  $('#btnBackup').addEventListener('click', openBackupSheet);
  $('#fileInput').addEventListener('change', function (e) { const f = e.target.files && e.target.files[0]; importFromFile(f); e.target.value = ''; });
  $('#btnWipe').addEventListener('click', function () {
    Sheet.confirmSheet({
      title: '清空全部数据?', message: '模板、设置、时间线、历史、计分、档案都会被删除并恢复初始状态,不可恢复。建议先备份。', okText: '确认清空', danger: true,
      onOk: function () { wipeData(); toast('已恢复初始状态'); }
    });
  });
}
