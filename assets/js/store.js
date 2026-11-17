import { $, $$, Caps, bus, copyText, debounce, deepCopy, el, fmtStamp, minutesOf, normalizeTime, nowHM, toast, todayStr, uid } from './core.js';
import { CK_PRESET, DISPATCH_DEFAULT } from './data.js';
import { Sheet, Sound } from './ui.js';

export function seedLookup() { return []; }

export function seedLookupSource() { return []; }

export function seedTemplates() {
  const t = (name, group, groupHint, content, varTypes) => ({
    id: uid(), name, group, groupHint, content, varTypes: varTypes || {}, builtin: true,
    createdAt: Date.now(), updatedAt: Date.now()
  });
  return [
    t('违禁品查获上报', '安检上报', '安检工作群',
      '【违禁品查获上报】\n时间:*日期* *发现时间*\n地点:*线路* *站点* *安检点*\n查获情况:安检过程中发现禁止携带物品 *违禁品件数* 件,明细如下:\n*违禁品清单*\n现场处置:已对物品进行控制,确保人物分离,并立即上报站方和民警,按现场情况组织先期处置。\n{?乘客情况}乘客情况:*乘客情况*\n{/乘客情况}{?备注}备注:*备注*\n{/备注}',
      { '发现时间': { type: 'time' }, '违禁品件数': { type: 'number' }, '违禁品清单': { type: 'items' }, '乘客情况': { type: 'single', options: ['配合处置,已移交民警', '拒绝配合安检', '已报公安机关处理', '乘客自行离站'] }, '备注': { type: 'text' } }),
    t('限带品处置登记', '安检上报', '安检工作群',
      '【限带品处置登记】\n时间:*日期* *发现时间*\n地点:*线路* *站点* *安检点*\n查获限制携带物品 *限带品件数* 件:\n*限带品清单*\n处置结果:*处置结果*\n{?乘客去向}乘客去向:*乘客去向*\n{/乘客去向}{?备注}备注:*备注*\n{/备注}',
      { '发现时间': { type: 'time' }, '限带品件数': { type: 'number' }, '限带品清单': { type: 'items' }, '处置结果': { type: 'single', options: DISPATCH_DEFAULT }, '乘客去向': { type: 'single', options: ['进站乘车', '携带物品离站', '换乘其他交通工具'] }, '备注': { type: 'text' } }),
    t('设备故障报修', '设备与勤务', '车站设备群',
      '【安检设备故障报修】\n报修时间:*日期* *报修时间*\n站点:*线路* *站点*\n故障设备:*设备名称*(*安检点*)\n故障现象:*故障现象*\n影响情况:*影响情况*\n{?已采取措施}已采取措施:*已采取措施*\n{/已采取措施}',
      { '报修时间': { type: 'time' }, '设备名称': { type: 'single', options: ['通道式安检机', '通过式安检门', '手持金属探测器', '液体探测仪', '炸药探测器', '防爆球', '其他设备'] }, '故障现象': { type: 'text' }, '影响情况': { type: 'single', options: ['单通道停用', '安检点停用', '不影响正常通行'] }, '已采取措施': { type: 'text' } }),
    t('交接班记录', '设备与勤务', '',
      '【交接班记录】\n交接时间:*日期* *交接时间*\n线路站点:*线路* *站点*\n安检点:*多安检点*\n接班人:*接班人*\n设备状态:*设备状态*\n本班次查获:违禁品 *违禁品件数* 件,限带品 *限带品件数* 件\n班次情况:*班次情况*\n{?待跟进事项}待跟进事项:*待跟进事项*\n{/待跟进事项}',
      { '交接时间': { type: 'time' }, '多安检点': { type: 'entrances' }, '接班人': { type: 'text' }, '设备状态': { type: 'single', options: ['全部正常', '部分设备故障(已报修)', '设备停用'] }, '违禁品件数': { type: 'number' }, '限带品件数': { type: 'number' }, '班次情况': { type: 'text' }, '待跟进事项': { type: 'text' } }),
    t('突发情况上报', '应急', '应急处置群',
      '【突发情况上报】\n上报时间：*日期* *上报时间*\n发生时间：*发生时间*\n地点：*线路* *站点* *安检点*\n事件类型：*事件类型*\n现场情况：*现场情况*\n已采取措施：*已采取措施*\n是否报警：*是否报警*\n{?人员伤亡}人员伤亡：*人员伤亡*\n{/人员伤亡}',
      { '上报时间': { type: 'time' }, '发生时间': { type: 'time' }, '事件类型': { type: 'single', options: ['乘客不配合安检', '扰乱安检秩序', '发现可疑物品', '火警烟感报警', '乘客身体不适', '打架斗殴', '其他突发情况'] }, '现场情况': { type: 'text' }, '已采取措施': { type: 'text' }, '人员伤亡': { type: 'text' }, '是否报警': { type: 'single', options: ['已报站方和民警', '已拨打110', '已拨打120', '暂未报警'] } })
  ];
}

export function seedTimeline() {
  return [
    { id: uid(), start: '07:30', end: '07:45', task: '班前会 + 设备自检', desc: '安检机、安检门、手探、液体探测仪通电测试', crossDay: false, notify: true, done: null, tplIds: [] },
    { id: uid(), start: '07:45', end: '09:30', task: '早高峰上岗', desc: '全面安检、人物同检、逢疑严检', crossDay: false, notify: true, done: null, tplIds: [] },
    { id: uid(), start: '12:00', end: '12:30', task: '轮换用餐', desc: '保证每个安检点在岗人数充足', crossDay: false, notify: true, done: null, tplIds: [] },
    { id: uid(), start: '17:30', end: '19:30', task: '晚高峰上岗', desc: '增派机动力量,做好客流控制', crossDay: false, notify: true, done: null, tplIds: [] },
    { id: uid(), start: '21:30', end: '22:00', task: '台账登记 + 交接班', desc: '查获物品台账如实登记,物品妥善移交', crossDay: false, notify: true, done: null, tplIds: [] }
  ];
}

export function seedData() {
  return {
    version: 5,
    settings: {
      line: '', station: '', leader: '', leaderPhone: '',
      contentItems: [], entrances: [], groups: [], members: [], custom: [], dispatchOptions: DISPATCH_DEFAULT.slice(),
      theme: 'auto', notify: { enabled: true, sound: true, vibrate: true, advanceMin: 0 },
      tplCollapsed: []
    },
    templates: [],
    timeline: [],
    lookup: [],
    lookupSource: [],
    history: [],
    formCache: {},
    reminderLog: { date: todayStr(), ids: [] },
    seeded: true,
    source: { importedAt: 0, station: '', line: '', leader: '', historyCount: 0, memberCount: 0 },
    scores: [], dismissed: [],
    meetSel: ['m01', 'm02', 'm04'], meetCustom: [], meetExtra: '', meetShowMembers: false,
    profiles: {}, checklist: null, ckOnlyMiss: false, reportManual: {}
  };
}



export const KEY = 'securityWorkbench.v1';

export const OLD_KEY = 'infoAssistantV4';

export function emptySettings() { return seedData().settings; }

export function normalize(d) {
  const base = seedData();
  if (!d || typeof d !== 'object') return base;
  const s = Object.assign(emptySettings(), d.settings || {});
  s.notify = Object.assign(base.settings.notify, d.settings && d.settings.notify ? d.settings.notify : {});
  if (!Array.isArray(s.entrances)) s.entrances = [];
  if (!Array.isArray(s.groups)) s.groups = [];
  if (!Array.isArray(s.members)) s.members = [];
  if (!Array.isArray(s.custom)) s.custom = [];
  if (!Array.isArray(s.contentItems)) s.contentItems = [];
  if (!Array.isArray(s.tplCollapsed)) s.tplCollapsed = [];
  /* 迁移:旧的单条 content -> contentItems */
  if (typeof s.content === 'string' && s.content.trim() && !s.contentItems.length) {
    s.contentItems = [{ id: uid(), name: '默认', text: s.content }];
  }
  s.content = '';
  if (!Array.isArray(s.dispatchOptions) || !s.dispatchOptions.length) s.dispatchOptions = DISPATCH_DEFAULT.slice();
  if (['auto', 'light', 'dark'].indexOf(s.theme) < 0) s.theme = 'auto';
  const out = {
    version: 5, settings: s,
    templates: Array.isArray(d.templates) ? d.templates : base.templates,
    timeline: Array.isArray(d.timeline) ? d.timeline : [],
    lookup: Array.isArray(d.lookup) ? d.lookup : base.lookup,
    lookupSource: Array.isArray(d.lookupSource) ? d.lookupSource : base.lookupSource,
    history: Array.isArray(d.history) ? d.history : [],
    formCache: (d.formCache && typeof d.formCache === 'object') ? d.formCache : {},
    reminderLog: (d.reminderLog && d.reminderLog.date) ? d.reminderLog : { date: todayStr(), ids: [] },
    lastTplId: typeof d.lastTplId === 'string' ? d.lastTplId : '',
    seeded: true,
    source: { importedAt: 0, station: '', line: '', leader: '', historyCount: 0, memberCount: 0 },
    scores: [], dismissed: [],
    meetSel: ['m01', 'm02', 'm04'], meetCustom: [], meetExtra: '', meetShowMembers: false,
    profiles: {}, checklist: null, ckOnlyMiss: false, reportManual: {}
  };
  out.templates.forEach(function (t) {
    if (!t.id) t.id = uid();
    if (typeof t.name !== 'string') t.name = '未命名模板';
    if (typeof t.content !== 'string') t.content = '';
    if (typeof t.group !== 'string') t.group = '';
    // groupHint 兼容：string -> array
    if (typeof t.groupHint === 'string') {
      t.groupHint = t.groupHint.trim() ? [t.groupHint.trim()] : [];
    } else if (!Array.isArray(t.groupHint)) {
      t.groupHint = [];
    }
    if (!t.varTypes || typeof t.varTypes !== 'object') t.varTypes = {};
    if (!Array.isArray(t.varOrder)) t.varOrder = [];
    if (typeof t.builtin !== 'boolean') t.builtin = false;
  });
  /* 清理孤儿表单缓存:模板已删除的 formCache 条目会永久残留在 localStorage */
  (function () {
    const validIds = {};
    out.templates.forEach(function (t) { validIds[t.id] = 1; });
    Object.keys(out.formCache).forEach(function (k) { if (!validIds[k]) delete out.formCache[k]; });
  })();
  out.timeline.forEach(function (i) {
    if (!i.id) i.id = uid();
    i.start = normalizeTime(i.start) || '';
    i.end = normalizeTime(i.end) || '';
    i.task = typeof i.task === 'string' ? i.task : '';
    i.desc = typeof i.desc === 'string' ? i.desc : '';
    i.crossDay = !!i.crossDay;
    i.notify = i.notify !== false;
    if (!Array.isArray(i.tplIds)) i.tplIds = [];
    if (i.done && typeof i.done !== 'object') i.done = null;
  });
  out.history = out.history.slice(0, 300).map(function (h) {
    return { id: h.id || uid(), templateId: h.templateId || '', templateName: h.templateName || '', text: String(h.text || ''), vals: (h.vals && typeof h.vals === 'object') ? h.vals : null, createdAt: h.createdAt || Date.now() };
  });
  out.source = Object.assign({ importedAt: 0, station: '', line: '', leader: '', historyCount: 0, memberCount: 0 }, d.source || {});
  ['scores', 'dismissed', 'meetCustom'].forEach(function (k) { if (!Array.isArray(out[k])) out[k] = []; });
  if (!Array.isArray(out.meetSel)) out.meetSel = ['m01', 'm02', 'm04'];
  if (typeof out.meetExtra !== 'string') out.meetExtra = '';
  out.meetShowMembers = !!out.meetShowMembers;
  if (!out.profiles || typeof out.profiles !== 'object') out.profiles = {};
  if (!out.reportManual || typeof out.reportManual !== 'object') out.reportManual = {};
  out.ckOnlyMiss = !!out.ckOnlyMiss;
  if (Array.isArray(d.members) && d.members.length && (!Array.isArray(out.settings.members) || !out.settings.members.length)) out.settings.members = d.members;
  if (!Array.isArray(out.checklist)) out.checklist = CK_PRESET.map(function (p) { return { id: uid(), cat: p.cat, text: p.text, done: false, doneAt: '' }; });
  return out;
}
export function migrateV4(d) {
  const out = seedData();
  const s = d.settings || {};
  let custom = s.custom;
  if (custom && !Array.isArray(custom)) {
    custom = Object.keys(custom).map(function (k) { return { id: uid(), key: k, type: 'text', value: custom[k] }; });
  }
  out.settings.line = s.line || '';
  out.settings.station = s.station || '';
  out.settings.leader = s.leader || '';
  out.settings.leaderPhone = s.leaderphone || s.leaderPhone || '';
  out.settings.custom = Array.isArray(custom) ? custom.map(function (c) {
    return { id: c.id || uid(), key: c.key || '', type: ['text', 'single', 'multi', 'number'].indexOf(c.type) >= 0 ? c.type : 'text', value: c.value == null ? '' : String(c.value) };
  }) : [];
  out.settings.entrances = Array.isArray(s.entrances) ? s.entrances.filter(function (x) { return !!x; }) : [];
  out.templates = (Array.isArray(d.templates) ? d.templates : []).map(function (t) {
    return {
      id: t.id || uid(), name: t.name || '未命名模板', group: '', groupHint: t.groupHint || '',
      content: t.content || '', varTypes: {}, builtin: false, createdAt: Date.now(), updatedAt: Date.now()
    };
  });
  out.timeline = (Array.isArray(d.timeline) ? d.timeline : []).map(function (i) {
    return { id: i.id || uid(), start: normalizeTime(i.start) || '', end: normalizeTime(i.end) || '', task: i.task || '', desc: i.desc || '', crossDay: false, notify: true, done: null, tplIds: [] };
  });
  /* 旧版空模板时补内置模板,避免迁移后一片空白 */
  if (!out.templates.length) out.templates = seedTemplates();
  return out;
}

export function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) {}
  try {
    const old = localStorage.getItem('infoAssistant.v5');
    if (old) { const p = JSON.parse(old); if (p && Array.isArray(p.templates)) { const m = normalize(p); try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} return m; } }
  } catch (e) {}
  try {
    const w = localStorage.getItem('teamWorkbench.v1');
    if (w) { const p = JSON.parse(w); const m = normalize(p); try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} return m; }
  } catch (e) {}
  try {
    const old = localStorage.getItem(OLD_KEY);
    if (old) { const p = JSON.parse(old); if (p && Array.isArray(p.templates)) { const m = normalize(migrateV4(p)); try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} return m; } }
  } catch (e) {}
  return normalize(seedData());
}

export let data = load();
Sound.enabled = data.settings.notify.sound;

export const persist = debounce(function () {
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch (e) { toast('保存失败:浏览器存储空间不足,建议清理历史记录'); }
}, 280);

export function save() { persist(); }

export function saveNow() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
}
window.addEventListener('pagehide', saveNow);
window.addEventListener('beforeunload', saveNow);

export function tplById(id) { return data.templates.filter(function (t) { return t.id === id; })[0] || null; }

export function customByKey(key) { return data.settings.custom.filter(function (c) { return c.key === key; })[0] || null; }



export function addHistory(text, tpl, vals) {
  if (!text) return;
  data.history.unshift({
    id: uid(), templateId: tpl ? tpl.id : '', templateName: tpl ? tpl.name : '',
    text: text, vals: (tpl && vals) ? vals : null, createdAt: Date.now()
  });
  if (data.history.length > 300) data.history.length = 300;
  save();
}

export function itemWindow(item) {
  const s = minutesOf(item.start);
  if (s < 0) return null;
  let e = item.end ? minutesOf(item.end) : s;
  if (e < 0) e = s;
  if (item.crossDay || e < s) e += 1440;
  return [s, e];
}

export function statusOf(item, nowMin) {
  const w = itemWindow(item);
  if (!w) return 'invalid';
  const s = w[0], e = w[1];
  if (nowMin >= s && nowMin <= e) return 'current';
  if (e >= 1440 && (nowMin + 1440) >= s && (nowMin + 1440) <= e) return 'current';
  if (e < 1440) return nowMin > e ? 'past' : 'future';
  const endedAgo = nowMin - (e - 1440);
  const startsIn = s - nowMin;
  if (endedAgo >= 0 && startsIn > 0) return endedAgo <= startsIn ? 'past' : 'future';
  return nowMin > e ? 'past' : 'future';
}

export function isDoneToday(item) {
  return !!(item.done && item.done.date === todayStr());
}

export function sortedTimeline() {
  return data.timeline.slice().sort(function (a, b) {
    const ta = minutesOf(a.start), tb = minutesOf(b.start);
    if (ta < 0 && tb < 0) return 0;
    if (ta < 0) return 1;
    if (tb < 0) return -1;
    return ta - tb;
  });
}

export function periodText(h) {
  if (h >= 5 && h < 8) return '清晨';
  if (h >= 8 && h < 12) return '上午';
  if (h >= 12 && h < 14) return '中午';
  if (h >= 14 && h < 18) return '下午';
  if (h >= 18 && h < 21) return '傍晚';
  return '夜间';
}

export function exportJSON() {
  const payload = deepCopy(data);
  payload.exportedAt = new Date().toISOString();
  payload.app = '信息助手';
  const text = JSON.stringify(payload, null, 2);
  const stamp = todayStr().replace(/-/g, '') + '-' + nowHM().replace(':', '');
  const station = (data.settings.station || '').trim();
  const line = (data.settings.line || '').trim();
  let prefix = '信息助手配置';
  if (line && station) prefix = '信息助手配置-' + line + station;
  else if (station) prefix = '信息助手配置-' + station;
  else if (line) prefix = '信息助手配置-' + line;
  if (Caps.download) {
    try {
      const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = prefix + '-' + stamp + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
      toast('已导出配置文件');
      return;
    } catch (e) { /* 降级到文本框 */ }
  }
  showJsonSheet('导出配置', text);
}

export function showJsonSheet(title, text) {
  const bodyNode = document.createElement('div');
  const tip = document.createElement('p');
  tip.className = 'section-note';
  tip.style.marginBottom = '9px';
  tip.textContent = '当前环境不支持直接下载文件,请长按下方文本全选复制,保存为 .json 文件后发给同事。';
  const ta = document.createElement('textarea');
  ta.className = 'textarea';
  ta.style.minHeight = '220px';
  ta.style.fontSize = '12px';
  ta.value = text;
  ta.setAttribute('aria-label', '配置 JSON');
  bodyNode.appendChild(tip); bodyNode.appendChild(ta);
  const footNode = document.createElement('div');
  footNode.className = 'btn-row';
  const cp = document.createElement('button');
  cp.type = 'button'; cp.className = 'btn btn-primary'; cp.textContent = '复制全部';
  cp.addEventListener('click', async function () {
    const ok = await copyText(text);
    toast(ok ? '已复制' : '复制失败,请手动全选');
  });
  footNode.appendChild(cp);
  Sheet.open({ title: title, bodyNode: bodyNode, footNode: footNode, autofocus: false });
}

export function applyImported(parsed) {
  let next;
  try {
    const isOld = parsed && (!parsed.version || parsed.version < 5);
    next = isOld ? normalize(migrateV4(parsed)) : normalize(parsed);
  } catch (e) {
    toast('导入失败:' + e.message);
    return;
  }
  const summary = '模板 ' + next.templates.length + ' 个\n时间线任务 ' + next.timeline.length + ' 个\n安检点 ' + next.settings.entrances.length + ' 个\n自定义变量 ' + next.settings.custom.length + ' 个\n速查条目 ' + next.lookup.length + ' 条\n上报记录 ' + next.history.length + ' 条';
  Sheet.confirmSheet({
    title: '确认导入并覆盖当前数据?',
    message: '导入会覆盖本机现有的全部模板、设置和时间线,此操作不可撤销。建议先导出一份当前配置备份。',
    detail: summary,
    okText: '确认导入',
    onOk: function () {
      data = next;
      saveNow();
      
      data.lastTplId = data.templates.length ? data.templates[0].id : '';
      
      
      bus.emit('refresh');
      toast('导入成功');
    }
  });
}

export function importFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    let parsed = null;
    try { parsed = JSON.parse(String(reader.result)); }
    catch (e) { toast('文件不是有效的 JSON'); return; }
    if (!validImport(parsed)) { toast('文件格式不正确'); return; }
    dispatchImport(parsed);
  };
  reader.onerror = function () { toast('读取文件失败'); };
  reader.readAsText(file, 'utf-8');
}

export function openImportSheet() {
  importCfg = { mode: 'full', tpl: true, lookup: true };
  const bodyNode = document.createElement('div');
  const modeLab = document.createElement('div'); modeLab.className = 'field-label'; modeLab.textContent = '导入方式';
  const modeRow = document.createElement('div'); modeRow.className = 'chip-group'; modeRow.style.marginBottom = '9px';
  const mergeBox = document.createElement('div'); mergeBox.hidden = true; mergeBox.style.marginBottom = '9px';
  const note = document.createElement('p'); note.className = 'section-note'; note.style.marginBottom = '10px';
  function setMode(m) {
    importCfg.mode = m;
    $$('.chip', modeRow).forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.mode === m ? 'true' : 'false'); });
    mergeBox.hidden = m !== 'merge';
    note.textContent = m === 'merge'
      ? '合并导入:只把文件里的模板/速查并进来,同名项覆盖,不动你的历史、设置、时间线、名单。适合更新中队下发的模板。'
      : '整包导入:用文件完整覆盖本机全部数据(模板、设置、时间线、历史)。建议先在「备份与恢复」里备份一份。';
  }
  [['full', '整包覆盖'], ['merge', '合并导入']].forEach(function (pair) {
    const c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.textContent = pair[1]; c.dataset.mode = pair[0];
    c.addEventListener('click', function () { setMode(pair[0]); });
    modeRow.appendChild(c);
  });
  function chk(label, key) {
    const lab = document.createElement('label'); lab.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-right:14px;font-size:.84rem';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = importCfg[key];
    cb.addEventListener('change', function () { importCfg[key] = cb.checked; });
    lab.appendChild(cb); lab.appendChild(document.createTextNode(label));
    return lab;
  }
  mergeBox.appendChild(chk('并入模板', 'tpl'));
  mergeBox.appendChild(chk('并入速查内容', 'lookup'));
  bodyNode.appendChild(modeLab); bodyNode.appendChild(modeRow); bodyNode.appendChild(mergeBox); bodyNode.appendChild(note);
  setMode('full');
  const p1 = document.createElement('p'); p1.className = 'section-note'; p1.style.marginBottom = '8px'; p1.textContent = '方式一:选择 .json 配置文件。';
  const pick = document.createElement('button'); pick.type = 'button'; pick.className = 'btn btn-block'; pick.textContent = '选择文件导入';
  pick.addEventListener('click', function () { $('#fileInput').click(); });
  const p2 = document.createElement('p'); p2.className = 'section-note'; p2.style.margin = '14px 0 8px'; p2.textContent = '方式二:把 JSON 内容粘贴到下面。';
  const ta = document.createElement('textarea'); ta.className = 'textarea'; ta.placeholder = '在此粘贴 JSON 配置'; ta.setAttribute('aria-label', '粘贴 JSON 配置');
  bodyNode.appendChild(p1); bodyNode.appendChild(pick); bodyNode.appendChild(p2); bodyNode.appendChild(ta);
  const footNode = document.createElement('div'); footNode.className = 'btn-row';
  const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'btn btn-primary'; ok.textContent = '解析并导入';
  ok.addEventListener('click', function () {
    const raw = ta.value.trim();
    if (!raw) { toast('请先粘贴 JSON 内容'); return; }
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) { toast('JSON 解析失败:' + e.message); return; }
    if (!validImport(parsed)) { toast('格式不正确'); return; }
    Sheet.closeNow();
    dispatchImport(parsed);
  });
  footNode.appendChild(ok);
  Sheet.open({ title: '导入配置', bodyNode: bodyNode, footNode: footNode });
}



export const SNAP_KEY = KEY + '.snap';

export const SNAP_MAX = 7;

export function loadSnapshots() {
  try { const a = JSON.parse(localStorage.getItem(SNAP_KEY) || '[]'); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}

export function saveSnapshots(arr) {
  while (arr.length) {
    try { localStorage.setItem(SNAP_KEY, JSON.stringify(arr)); return true; }
    catch (e) { arr.shift(); }   // 配额不足,从最旧开始丢
  }
  try { localStorage.removeItem(SNAP_KEY); } catch (e) {}
  return false;
}

export function makeSnapshot() {
  const arr = loadSnapshots();
  arr.push({ at: Date.now(), data: deepCopy(data) });
  while (arr.length > SNAP_MAX) arr.shift();
  const ok = saveSnapshots(arr);
  updateBackupLast();
  return ok;
}

export function autoSnapshot() {
  const arr = loadSnapshots();
  const last = arr.length ? todayStr(new Date(arr[arr.length - 1].at)) : '';
  if (last !== todayStr()) makeSnapshot();
  updateBackupLast();
}

export function updateBackupLast() {
  const el = $('#backupLast');
  if (!el) return;
  const arr = loadSnapshots();
  el.textContent = arr.length ? ('上次备份:' + fmtStamp(arr[arr.length - 1].at) + ' · 共 ' + arr.length + ' 份快照,每天首次打开自动备份')
                              : '还没有备份,点上方「备份与恢复」立即备份一份';
}

export function openBackupSheet() {
  const body = document.createElement('div');
  const note = document.createElement('p');
  note.className = 'section-note'; note.style.marginBottom = '10px';
  note.textContent = '每天首次打开会自动备份一份,保留最近 ' + SNAP_MAX + ' 份。恢复会用该快照覆盖当前全部数据,操作前请确认。';
  body.appendChild(note);
  const listBox = document.createElement('div');
  body.appendChild(listBox);
  function paint() {
    listBox.innerHTML = '';
    const arr = loadSnapshots().slice().reverse();
    if (!arr.length) {
      const e = document.createElement('div'); e.className = 'empty'; e.textContent = '还没有快照,点下方「立即备份」';
      listBox.appendChild(e); return;
    }
    arr.forEach(function (sn) {
      const row = document.createElement('div'); row.className = 'snap-row';
      const info = document.createElement('div'); info.className = 'snap-info';
      const t = document.createElement('div'); t.className = 'snap-time'; t.textContent = fmtStamp(sn.at);
      const m = document.createElement('div'); m.className = 'snap-meta';
      const d = sn.data || {};
      m.textContent = '模板 ' + (d.templates || []).length + ' · 历史 ' + (d.history || []).length + ' · 速查 ' + (d.lookup || []).length;
      info.appendChild(t); info.appendChild(m);
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn btn-sm'; btn.textContent = '恢复';
      btn.addEventListener('click', function () {
        Sheet.confirmSheet({
          title: '恢复这份备份?', message: '将用 ' + fmtStamp(sn.at) + ' 的快照覆盖当前全部数据,此操作不可撤销。', okText: '恢复', danger: true,
          onOk: function () {
            data = normalize(sn.data);
            saveNow();
            
            data.lastTplId = data.templates.length ? data.templates[0].id : '';
            
            
            bus.emit('refresh');
            toast('已恢复到 ' + fmtStamp(sn.at));
          }
        });
      });
      row.appendChild(info); row.appendChild(btn);
      listBox.appendChild(row);
    });
  }
  paint();
  const foot = document.createElement('div'); foot.className = 'btn-row';
  const mkBtn = document.createElement('button'); mkBtn.type = 'button'; mkBtn.className = 'btn btn-primary'; mkBtn.textContent = '立即备份';
  mkBtn.addEventListener('click', function () { const ok = makeSnapshot(); paint(); toast(ok ? '已备份当前数据' : '备份失败:存储空间不足'); });
  const close = document.createElement('button'); close.type = 'button'; close.className = 'btn'; close.textContent = '关闭';
  close.addEventListener('click', function () { Sheet.closeNow(); });
  foot.appendChild(mkBtn); foot.appendChild(close);
  Sheet.open({ title: '备份与恢复', bodyNode: body, footNode: foot, autofocus: false });
}



export let importCfg = { mode: 'full', tpl: true, lookup: true };

export function validImport(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;
  if (importCfg.mode === 'merge') return Array.isArray(parsed.templates) || Array.isArray(parsed.lookup);
  return Array.isArray(parsed.templates);
}

export function dispatchImport(parsed) {
  if (importCfg.mode === 'merge') applyMerge(parsed);
  else applyImported(parsed);
}

export function infoSheet(title, text) {
  const body = document.createElement('div');
  const p = document.createElement('div'); p.className = 'preview'; p.style.whiteSpace = 'pre-wrap'; p.textContent = text;
  body.appendChild(p);
  const foot = document.createElement('div');
  const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'btn btn-primary btn-block'; ok.textContent = '知道了';
  ok.addEventListener('click', function () { Sheet.closeNow(); });
  foot.appendChild(ok);
  Sheet.open({ title: title, bodyNode: body, footNode: foot, autofocus: false });
}

export function applyMerge(parsed) {
  if (!parsed || typeof parsed !== 'object') { toast('格式不正确'); return; }
  const inc = normalize(parsed);
  let tAdd = 0, tRep = 0, lAdd = 0, lRep = 0;
  if (importCfg.tpl && Array.isArray(parsed.templates)) {
    inc.templates.forEach(function (t) {
      const nm = String(t.name || '').trim();
      const idx = data.templates.findIndex(function (x) { return String(x.name || '').trim() === nm; });
      if (idx >= 0) {
        const keepId = data.templates[idx].id, keepCreated = data.templates[idx].createdAt;
        data.templates[idx] = Object.assign({}, t, { id: keepId, createdAt: keepCreated, updatedAt: Date.now(), builtin: false });
        tRep++;
      } else {
        data.templates.push(Object.assign({}, t, { id: uid(), createdAt: Date.now(), updatedAt: Date.now(), builtin: false }));
        tAdd++;
      }
    });
  }
  if (importCfg.lookup && Array.isArray(parsed.lookup)) {
    inc.lookup.forEach(function (r) {
      const key = r.kind + '|' + String(r.name || '').trim();
      const idx = data.lookup.findIndex(function (x) { return x.kind + '|' + String(x.name || '').trim() === key; });
      if (idx >= 0) { data.lookup[idx] = deepCopy(r); lRep++; }
      else { data.lookup.push(deepCopy(r)); lAdd++; }
    });
    if (Array.isArray(parsed.lookupSource)) data.lookupSource = inc.lookupSource.slice();
  }
  save();
  bus.emit('refresh');
  const parts = [];
  if (importCfg.tpl) parts.push('模板:新增 ' + tAdd + ' · 覆盖 ' + tRep);
  if (importCfg.lookup) parts.push('速查:新增 ' + lAdd + ' · 覆盖 ' + lRep);
  infoSheet('合并导入完成', parts.join('\n') + '\n\n历史记录、设置、时间线、队员名单均未改动。');
}



export function wipeData() {
  data = normalize(seedData());
  data.lastTplId = data.templates.length ? data.templates[0].id : '';
  saveNow();
  bus.emit('refresh');
}
