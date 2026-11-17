import { $, $$, bus, copyText, debounce, deepCopy, el, escapeRe, flashButton, mk, normalizeTime, nowHM, pad2, toast, todayStr, uid } from './core.js';
import { MAKER_TYPES, PRESET_MAP } from './data.js';
import { addHistory, customByKey, data, save, sortedTimeline, statusOf, tplById } from './store.js';
import { Sheet } from './ui.js';

export function inferType(name) {
  const c = customByKey(name);
  if (c) return c.type === 'number' ? 'number' : c.type;
  if (name === '年' || name === '月' || name === '日') return 'date';
  if (name.indexOf('日期') >= 0) return 'date';
  if (name.indexOf('时间') >= 0) return 'time';
  if (name === '多安检点') return 'entrances';
  if (name === '安检点') return 'entrance';
  if (name === '多人员') return 'members';
  if (name === '人员') return 'member';
  if (/(件数|数量|人数|次数)$/.test(name)) return 'number';
  if (/(清单|明细)$/.test(name)) return 'items';
  return 'text';
}

export function extractVars(content) {
  const set = [];
  const seen = {};
  let m;
  const re = /\*([^*\n]+)\*/g;
  while ((m = re.exec(content)) !== null) { const n = m[1].trim(); if (n && !seen[n]) { seen[n] = 1; set.push(n); } }
  const re2 = /\{\?([^}]+)\}/g;
  while ((m = re2.exec(content)) !== null) { const n = m[1].trim(); if (n && !seen[n]) { seen[n] = 1; set.push(n); } }
  return set;
}

export function varType(tpl, name) {
  const declared = tpl && tpl.varTypes && tpl.varTypes[name];
  if (declared && declared.type) return declared.type;
  return inferType(name);
}

export function varOptions(tpl, name) {
  const declared = tpl && tpl.varTypes && tpl.varTypes[name];
  if (declared && Array.isArray(declared.options) && declared.options.length) return declared.options.slice();
  const c = customByKey(name);
  if (c) return String(c.value || '').split('|').map(function (x) { return x.trim(); }).filter(Boolean);
  if (name === '处置结果') return data.settings.dispatchOptions.slice();
  if (name === '安检点') return data.settings.entrances.filter(Boolean);
  if (name === '多安检点') return data.settings.entrances.filter(Boolean);
  if (name === '人员' || name === '多人员') {
    return (data.settings.members || []).filter(function (m) { return m.name; }).map(function (m) {
      return m.name + (m.id ? '（' + m.id + '）' : '');
    });
  }
  return [];
}
/* 预设值:基本信息与固定文本型自定义变量,直接替换、不生成输入框 */

export function presetValue(name) {
  const k = PRESET_MAP[name];
  if (k) { const v = data.settings[k]; return typeof v === 'string' ? v.trim() : ''; }
  const c = customByKey(name);
  if (c && c.type === 'text') return String(c.value || '');
  return '';
}

export function defaultByType(name, type) {
  const d = new Date();
  if (type === 'time') return nowHM(d);
  if (type === 'date') {
    if (name === '年') return String(d.getFullYear());
    if (name === '月') return String(d.getMonth() + 1);
    if (name === '日') return String(d.getDate());
    /* 日期变量内部统一使用 ISO,输出时再转中文,避免控件与预览不一致 */
    return todayStr(d);
  }
  if (type === 'number') return /件数|数量|人数|次数/.test(name) ? '0' : '1';
  if (type === 'single') { const o = varOptions(null, name); return o.length ? '' : ''; }
  return '';
}

export function countVarOf(name) {
  const base = name.replace(/(清单|明细|信息)$/, '');
  return base && base !== name ? base + '件数' : name + '件数';
}

export function getFields(tpl, name) {
  const declared = tpl && tpl.varTypes && tpl.varTypes[name];
  if (declared && Array.isArray(declared.fields) && declared.fields.length) return declared.fields;
  return null;
}

export function getRowFormat(tpl, name) {
  const declared = tpl && tpl.varTypes && tpl.varTypes[name];
  return (declared && declared.rowFormat) || '';
}

export function itemsToText(items, fields, rowFormat) {
  if (!items || !items.length) return '';
  if (fields) {
    const filtered = items.filter(function (it) {
      return fields.some(function (f) { return (it[f.key] || '').trim(); });
    });
    
    // 新增：统一格式化日期为中文格式
    function formatFieldValue(val, type) {
      if (!val) return '';
      if (type === 'date') {
        const m = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) return parseInt(m[1], 10) + '年' + parseInt(m[2], 10) + '月' + parseInt(m[3], 10) + '日';
      }
      return val;
    }

    if (rowFormat) {
      // 自定义行格式
      return filtered.map(function (it) {
        let line = rowFormat;
        fields.forEach(function (f) {
          const rawVal = (it[f.key] || '').trim();
          const v = formatFieldValue(rawVal, f.type);
          line = line.split('*' + f.key + '*').join(v);
        });
        return line;
      }).join('\n\n');
    }
    // 默认格式：第一个字段无前缀，其余带前缀
    return filtered.map(function (it) {
      const parts = [];
      fields.forEach(function (f, fi) {
        const rawVal = (it[f.key] || '').trim();
        const v = formatFieldValue(rawVal, f.type);
        if (v) {
          if (fi === 0) parts.push(v);
          else parts.push(f.key + ':' + v);
        }
      });
      return parts.join(' ');
    }).join('\n\n');
  }
  // 默认字段模式（兼容旧数据）
  return items.filter(function (it) { return (it.name || '').trim() || (it.spec || '').trim(); })
    .map(function (it, i) {
      const parts = [];
      parts.push((i + 1) + '. ' + ((it.name || '').trim() || '未填写名称'));
      if ((it.spec || '').trim()) parts.push(' 规格数量:' + it.spec.trim());
      const cnt = parseInt(it.count, 10);
      if (cnt && cnt > 1) parts.push(' 数量:' + cnt);
      if (it.method) parts.push(' 处置:' + it.method);
      if ((it.note || '').trim()) parts.push(' 备注:' + it.note.trim());
      return parts.join('');
    }).join('\n');
}

export function computeSums(items, fields) {
  if (!items || !fields) return {};
  const sums = {};
  fields.forEach(function (f) {
    if (f.type !== 'number' || !f.sum) return;
    let total = 0;
    items.forEach(function (it) {
      total += parseInt(it[f.key], 10) || 0;
    });
    sums['总' + f.key] = String(total);
  });
  return sums;
}

export function applyConditionals(content, values) {
  return content.replace(/\{\?([^}]+)\}([\s\S]*?)\{\/\1\}/g, function (all, name, inner) {
    const v = values[name.trim()];
    const s = v == null ? '' : String(v).trim();
    return s === '' ? '' : inner;
  });
}

export function renderTemplate(tpl, values) {
  if (!tpl || !tpl.content) return '';
  const vals = Object.assign({}, values);
  const vars = extractVars(tpl.content);
  /* 物品清单 -> 文本,并回填件数变量和汇总变量 */
  vars.forEach(function (name) {
    if (varType(tpl, name) !== 'items') return;
    const items = vals[name + '__items'] || [];
    const fields = getFields(tpl, name);
    const rowFormat = getRowFormat(tpl, name);
    const text = itemsToText(items, fields, rowFormat);
    vals[name] = text;
    const cv = countVarOf(name);
    if (vars.indexOf(cv) >= 0) {
      const n = fields
        ? items.filter(function (it) { return fields.some(function (f) { return (it[f.key] || '').trim(); }); }).length
        : items.filter(function (it) { return (it.name || '').trim() || (it.spec || '').trim(); }).length;
      vals[cv] = String(n);
    }
    // 计算汇总变量
    if (fields) {
      const sums = computeSums(items, fields);
      Object.keys(sums).forEach(function (k) { vals[k] = sums[k]; });
    }
  });
  let out = applyConditionals(tpl.content, vals);
  /* 长变量名优先替换,避免前缀相互干扰 */
  vars.slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (name) {
    const vt = varType(tpl, name);
    let v = vals[name];
    if (v == null || String(v).trim() === '') {
      if (vt === 'date' || vt === 'time') v = defaultByType(name, vt);
    }
    if (v == null) v = '';
    v = String(v);
    if (vt === 'date' && v) {
      if (['年', '月', '日'].indexOf(name) >= 0) {
        v = v + name;
      } else {
        /* 内部存 ISO,输出转回中文,控件与预览保持一致 */
        const dm = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dm) v = parseInt(dm[1], 10) + '年' + parseInt(dm[2], 10) + '月' + parseInt(dm[3], 10) + '日';
      }
    }
    out = out.split('*' + name + '*').join(v);
  });
  /* 收尾:压缩空行 */
  out = out.split('\n').map(function (l) { return l.replace(/\s+$/, ''); }).join('\n');
  out = out.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n+$/, '');
  return out;
}
/* 只出现在可选段 {?变量}…{/变量} 里的变量属于选填,空着不算漏填 */

export function optionalOnlyVars(content) {
  const spans = [];
  const re = /\{\?([^}]+)\}([\s\S]*?)\{\/\1\}/g;
  let m;
  while ((m = re.exec(content)) !== null) spans.push([m.index, m.index + m[0].length]);
  const out = {};
  extractVars(content).forEach(function (name) {
    const vr = new RegExp('\\*' + escapeRe(name) + '\\*', 'g');
    let hit = false, allIn = true, mm;
    while ((mm = vr.exec(content)) !== null) {
      hit = true;
      const at = mm.index;
      if (!spans.some(function (sp) { return at >= sp[0] && at < sp[1]; })) { allIn = false; break; }
    }
    if (hit && allIn) out[name] = 1;
  });
  return out;
}
/* 漏填判定:只看真正需要手填的变量。
   自动带入的基本信息、自动求和与件数变量、可选段内的变量都不算;
   物品清单为空视为漏填(清单没填就发汇总,正文会缺一整块数据)。 */

export function missingVars(tpl, values) {
  if (!tpl) return [];
  const opt = optionalOnlyVars(tpl.content);
  const miss = [];
  visibleVars(tpl).forEach(function (name) {
    if (opt[name]) return;
    const type = varType(tpl, name);
    if (type === 'items') {
      const arr = values[name + '__items'];
      if (!Array.isArray(arr) || !arr.length) miss.push(name);
      return;
    }
    let v = values[name];
    if (v == null) v = defaultByType(name, type);
    if (Array.isArray(v)) { if (!v.length) miss.push(name); return; }
    if (!String(v == null ? '' : v).trim()) miss.push(name);
  });
  return miss;
}
/* 复制前拦一道:漏填就列出来让用户确认,仍可选择照发 */

export function copyWithCheck() {
  const text = currentText();
  if (!text) { toast('暂无内容可复制'); return; }
  const tpl = tplById(currentTplId);
  const miss = tpl ? missingVars(tpl, values) : [];
  if (!miss.length) { doCopy(text, $('#btnCopy'), $('#btnCopyText')); return; }
  Sheet.confirmSheet({
    title: '还有 ' + miss.length + ' 项没填',
    message: '这些变量现在是空的,发出去可能要返工。要现在复制吗?',
    detail: '未填：' + miss.join('、'),
    okText: '仍要复制',
    cancelText: '返回填写',
    onOk: function () { doCopy(text, $('#btnCopy'), $('#btnCopyText')); },
    onCancel: function () {
      let el = null;
      $$('#formArea [data-var]').forEach(function (n) { if (!el && n.dataset.var === miss[0]) el = n; });
      if (!el) return;
      try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { try { el.scrollIntoView(); } catch (e2) {} }
      const f = el.querySelector('input:not([type=hidden]),select,textarea,button');
      if (f && f.focus) { try { f.focus({ preventScroll: true }); } catch (e) {} }
    }
  });
}


export let currentTplId = null;

export let values = {};

export let touchedVars = {};          // 用户手动改过的变量,自动刷新时跳过

export const collapsedGroups = new Set(Array.isArray(data.settings.tplCollapsed) ? data.settings.tplCollapsed : []);

export let tplQuery = '';

export let previewQueued = false;

export function persistCollapsedGroups() {
  data.settings.tplCollapsed = Array.from(collapsedGroups);
  save();
}

export function saveFormCache() {
  if (!currentTplId) return;
  try { data.formCache[currentTplId] = deepCopy(values); } catch (e) { data.formCache[currentTplId] = values; }
  save();
}
/* 日期/时间属于「每次填写都应反映当前时刻」的变量,缓存里不保留,
   打开时一律重新取当前值,避免每次都要手动删掉上次的时间 */

export function loadFormCache(id) {
  const c = data.formCache[id];
  if (!c || typeof c !== 'object') return {};
  const out = deepCopy(c);
  const tpl = tplById(id);
  if (tpl) {
    extractVars(tpl.content).forEach(function (name) {
        const type = varType(tpl, name);
        if (type === 'time' || type === 'date' || name === '内容') delete out[name];
      });
  }
  return out;
}

export function ensureValues(tpl) {
  if (!tpl) return;
  extractVars(tpl.content).forEach(function (name) {
    const type = varType(tpl, name);
    if (type === 'items') {
      if (!Array.isArray(values[name + '__items'])) values[name + '__items'] = [];
      if (!(name in values)) values[name] = '';
      return;
    }
    if (name in values && String(values[name] || '').length) return;
    const p = presetValue(name);
    if (p) { values[name] = p; return; }
    /* 内容变量:从设置页「内容」第一条预填,可再修改;保留换行 */
    if (name === '内容' && data.settings.contentItems && data.settings.contentItems.length) {
      values[name] = data.settings.contentItems[0].text || '';
      return;
    }
    const d = defaultByType(name, type);
    if (!(name in values)) values[name] = d;
    /* 单选/多选不预选,避免误报;由「待填」提示引导用户选择 */
  });
}

export function selectTemplate(id, keepValues) {
  if (currentTplId && currentTplId !== id) saveFormCache();
  currentTplId = id;
  data.lastTplId = id;
  touchedVars = {};                       // 换模板后回到「自动填充」状态
  const tpl = tplById(id);
  if (!keepValues) {
    values = loadFormCache(id);
    if (!Object.keys(values).length) values = {};
  }
  if (tpl) ensureValues(tpl);
  const g = (tpl && tpl.group || '').trim();
  if (collapsedGroups.has(g)) { collapsedGroups.delete(g); persistCollapsedGroups(); }
  renderForm();
  renderGroupHint();
  renderPreview();
}

export function groupsOf() {
  const seen = {}, out = [];
  data.templates.forEach(function (t) { const g = (t.group || '').trim(); if (g && !seen[g]) { seen[g] = 1; out.push(g); } });
  return out;
}

export function renderTplChips() {
  const box = $('#tplList'), countEl = $('#tplCount'), toggleBtn = $('#btnToggleGroups');
  if (!box) return;
  box.innerHTML = '';
  const q = tplQuery.trim().toLowerCase();
  const groups = groupsOf();
  const shown = data.templates.filter(function (t) {
    if (!q) return true;
    return (t.name + ' ' + (t.group || '') + ' ' + t.content).toLowerCase().indexOf(q) >= 0;
  });
  countEl.textContent = !data.templates.length ? ''
    : (q ? '匹配 ' + shown.length + ' / ' + data.templates.length + ' 个模板'
         : '共 ' + data.templates.length + ' 个模板,竖向列表选择');
  toggleBtn.hidden = groups.length < 2 || !!q;
  toggleBtn.textContent = collapsedGroups.size ? '展开全部' : '折叠全部';
  function empty(text) {
    const e = document.createElement('div');
    e.className = 'tpl-list-empty';
    e.textContent = text;
    return e;
  }
  if (!data.templates.length) {
    box.appendChild(empty('还没有模板,点右上角「制作模板」用现成文本生成,或点「管理模板」新建。'));
    return;
  }
  if (!shown.length) {
    box.appendChild(empty('没有匹配的模板,换个关键词试试。'));
    return;
  }
  const linkedIds = linkedTplIds();
  function addItem(host, t) {
    const node = mk('tpl-picker-item');
    node.dataset.id = t.id;
    $('.ti-name', node).textContent = t.name;
    const on = t.id === currentTplId;
    node.classList.toggle('on', on);
    node.setAttribute('aria-selected', on ? 'true' : 'false');
    const linked = linkedIds.indexOf(t.id) >= 0;
    node.classList.toggle('linked', linked);
    if (linked && !on) $('.ti-mark', node).hidden = false;
    node.addEventListener('click', function () { selectTemplate(t.id); renderTplChips(); });
    host.appendChild(node);
  }
  function addGroup(label, key, list) {
    const node = mk('tpl-picker-group');
    const head = $('.tpl-group-head', node);
    $('.tg-name', head).textContent = label;
    $('.tg-count', head).textContent = list.length + ' 个';
    const collapsed = collapsedGroups.has(key);
    head.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    const host = $('.tg-items', node);
    host.hidden = collapsed;
    list.forEach(function (t) { addItem(host, t); });
    head.addEventListener('click', function () {
      if (collapsedGroups.has(key)) collapsedGroups.delete(key);
      else collapsedGroups.add(key);
      persistCollapsedGroups();
      renderTplChips();
    });
    box.appendChild(node);
  }
  // 搜索时平铺命中项,避免结果被折叠的分组藏起来
  if (q || groups.length < 2) {
    shown.forEach(function (t) { addItem(box, t); });
    return;
  }
  groups.forEach(function (g) {
    const list = shown.filter(function (t) { return (t.group || '').trim() === g; });
    if (list.length) addGroup(g, g, list);
  });
  const rest = shown.filter(function (t) { return !(t.group || '').trim(); });
  if (rest.length) addGroup('未分组', '', rest);
}

export function renderGroupHint() {
  const tpl = tplById(currentTplId);
  const wrap = $('#groupHintWrap'), txt = $('#groupHintText');
  const groups = Array.isArray(tpl && tpl.groupHint) ? tpl.groupHint.filter(Boolean) : [];
  if (groups.length) {
    txt.textContent = '发往：' + groups.join('、');
    wrap.hidden = false;
  } else { wrap.hidden = true; }
}

export function visibleVars(tpl) {
  if (!tpl) return [];
  const all = extractVars(tpl.content);
  const derived = {};
  // 标记自动生成的件数变量
  all.forEach(function (n) { if (varType(tpl, n) === 'items') derived[countVarOf(n)] = 1; });
  // 标记自动生成的汇总变量（总XXX）
  all.forEach(function (n) {
    if (varType(tpl, n) === 'items') {
      const fields = getFields(tpl, n);
      if (fields) {
        fields.forEach(function (f) {
          if (f.type === 'number' && f.sum) derived['总' + f.key] = 1;
        });
      }
    }
  });
  let result = all.filter(function (name) {
    if (['年', '月', '日'].indexOf(name) >= 0) return false;
    if (presetValue(name)) return false;
    if (derived[name]) return false;
    return true;
  });
  // 应用自定义排序
  if (tpl.varOrder && tpl.varOrder.length) {
    result.sort(function (a, b) {
      const ai = tpl.varOrder.indexOf(a);
      const bi = tpl.varOrder.indexOf(b);
      if (ai < 0 && bi < 0) return 0;
      if (ai < 0) return 1;
      if (bi < 0) return -1;
      return ai - bi;
    });
  }
  return result;
}

export function fieldLabel(node, name, type) {
  const l = $('.fl-name', node);
  l.textContent = name;
  if (type === 'time') l.textContent = name;
}

export function bindStepper(host, opts) {
  const input = $('.stepper-input', host);
  const min = opts.min != null ? opts.min : parseInt(input.getAttribute('min') || '0', 10);
  const max = opts.max != null ? opts.max : parseInt(input.getAttribute('max') || '999', 10);
  const clamp = (v) => Math.min(max, Math.max(min, isNaN(v) ? min : v));
  const commit = function (v, rerender) {
    input.value = String(v);
    opts.onChange(v, rerender);
  };
  $$('.stepper-btn', host).forEach(function (b) {
    b.addEventListener('click', function () {
      const dir = parseInt(b.dataset.dir, 10) || 1;
      commit(clamp((parseInt(input.value, 10) || 0) + dir), true);
    });
  });
  input.addEventListener('input', function () {
    const raw = input.value.trim();
    if (raw === '' || raw === '-') return;
    const v = parseInt(raw, 10);
    if (isNaN(v)) return;
    opts.onChange(v, false);
  });
  input.addEventListener('blur', function () { commit(clamp(parseInt(input.value, 10))); });
  input.addEventListener('change', function () { commit(clamp(parseInt(input.value, 10))); });
  return { set: function (v) { input.value = String(clamp(v)); } };
}

export function buildField(tpl, name) {
  const type = varType(tpl, name);
  if (type === 'items') return buildItemsField(tpl, name);
  if (type === 'number') {
    const node = mk('tpl-field-number');
    fieldLabel(node, name, type);
    const input = $('.stepper-input', node);
    input.min = '0'; input.max = '9999';
    input.value = String(parseInt(values[name], 10) || 0);
    input.setAttribute('aria-label', name);
    bindStepper($('.stepper', node), {
      min: 0, max: 9999,
      onChange: function (v) { values[name] = String(v); queuePreview(); }
    });
    return node;
  }
  if (type === 'time') {
    const node = mk('tpl-field-time');
    fieldLabel(node, name, type);
    const input = $('.input', node);
    input.value = normalizeTime(values[name]) || '';
    input.setAttribute('aria-label', name);
    const hint = $('.field-hint', node);
    hint.hidden = false;
    hint.textContent = '支持 08:30、8.30、830 等写法,失焦时自动规范化';
    input.addEventListener('input', function () {
      touchedVars[name] = true;
      values[name] = input.value;
      queuePreview();
    });
    input.addEventListener('blur', function () {
      const n = normalizeTime(input.value);
      input.value = n || '';
      values[name] = n || '';
      queuePreview();
    });
    return node;
  }
  if (type === 'date') {
    const node = mk('tpl-field-text');
    fieldLabel(node, name, type);
    const input = $('.input', node);
    input.type = 'date';
    let iso = String(values[name] || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const m = iso.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);   // 兼容旧的 2026年10月2日
      iso = m ? (m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3])) : todayStr();
    }
    values[name] = iso;          // 关键：回写，保证控件与预览一致
    input.value = iso;
    input.setAttribute('aria-label', name);
    input.addEventListener('input', function () { touchedVars[name] = true; });
    input.addEventListener('change', function () {
      touchedVars[name] = true;
      values[name] = input.value;
      queuePreview();
    });
    return node;
  }
  if (type === 'single' || type === 'entrance' || type === 'member') {
    const opts = varOptions(tpl, name);
    const node = mk('tpl-field-select');
    fieldLabel(node, name, type);
    const sel = $('.select', node);
    sel.setAttribute('aria-label', name);
    const ph = document.createElement('option');
    ph.value = ''; ph.textContent = opts.length ? '请选择' : '未配置选项';
    sel.appendChild(ph);
    opts.forEach(function (o) {
      const op = document.createElement('option');
      op.value = o; op.textContent = o;
      sel.appendChild(op);
    });
    sel.value = values[name] || '';
    if (!sel.value && values[name]) {
      const op = document.createElement('option');
      op.value = values[name]; op.textContent = values[name];
      sel.appendChild(op); sel.value = values[name];
    }
    sel.addEventListener('change', function () { values[name] = sel.value; queuePreview(); });
    if (!opts.length) {
      const hint = $('.field-hint', node);
      hint.hidden = false;
      const hintMap = { entrance: '安检点', member: '人员' };
      hint.textContent = '还没有可选项,去「设置」里添加' + (hintMap[type] || '该变量的选项') + ',或在模板管理里为此变量配置选项';
    }
    return node;
  }
  if (type === 'multi' || type === 'entrances' || type === 'members') {
    const opts = varOptions(tpl, name);
    const node = mk('tpl-field-multi');
    fieldLabel(node, name, type);
    const box = $('.chip-group', node);
    const selected = String(values[name] || '').split('、').map(function (x) { return x.trim(); }).filter(Boolean);
    if (!opts.length) {
      const hint = $('.field-hint', node);
      hint.hidden = false;
      const hintMap = { entrances: '安检点', members: '人员' };
      hint.textContent = '还没有可选项,去「设置」里添加' + (hintMap[type] || '该变量的选项');
    }
    opts.forEach(function (o) {
      const c = mk('tpl-chip');
      c.textContent = o;
      c.setAttribute('aria-pressed', selected.indexOf(o) >= 0 ? 'true' : 'false');
      c.addEventListener('click', function () {
        const on = c.getAttribute('aria-pressed') === 'true';
        c.setAttribute('aria-pressed', on ? 'false' : 'true');
        const now = $$('.chip', box).filter(function (x) { return x.getAttribute('aria-pressed') === 'true'; })
          .map(function (x) { return x.textContent; });
        values[name] = now.join('、');
        queuePreview();
      });
      box.appendChild(c);
    });
    return node;
  }
  const node = mk('tpl-field-text');
  fieldLabel(node, name, type);
  const input = $('.input', node);
  const isContent = name === '内容';
  const long = /(情况|现象|措施|事项|备注|说明|描述)$/.test(name) || isContent;
  if (long) {
    const ta = document.createElement('textarea');
    ta.className = 'input' + (isContent ? ' textarea' : '');
    ta.rows = isContent ? 9 : 2;
    if (isContent) ta.style.minHeight = '200px';
    ta.placeholder = '请输入' + name;
    ta.value = values[name] || '';
    ta.setAttribute('aria-label', name);
    ta.addEventListener('input', function () { values[name] = ta.value; queuePreview(); });
    input.parentNode.replaceChild(ta, input);
    if (isContent) {
      const items = data.settings.contentItems || [];
      if (items.length > 1) {
        const chooser = document.createElement('div');
        chooser.className = 'chip-group';
        chooser.style.marginBottom = '8px';
        items.forEach(function (it) {
          const c = mk('tpl-chip');
          c.textContent = it.name || '内容';
          c.setAttribute('aria-pressed', values[name] === it.text ? 'true' : 'false');
          c.addEventListener('click', function () {
            values[name] = it.text || '';
            ta.value = it.text || '';
            queuePreview();
            $$('.chip', chooser).forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
          });
          chooser.appendChild(c);
        });
        node.insertBefore(chooser, ta);
      }
    }
  } else if (/(违禁品|限带品)/.test(name)) {
    buildItemCombo(node, input, tpl, name);
  } else {
    input.placeholder = '请输入' + name;
    input.value = values[name] || '';
    input.setAttribute('aria-label', name);
    input.addEventListener('input', function () { values[name] = input.value; queuePreview(); });
  }
  return node;
}

export function buildItemsField(tpl, name) {
  const node = mk('tpl-field-items');
  fieldLabel(node, name, 'items');
  const box = $('.items-box', node);
  const addBtn = $('.items-add', node);
  const stepper = $('.stepper', node);
  const items = values[name + '__items'] || (values[name + '__items'] = []);
  const fields = getFields(tpl, name);

  if (fields) {
    // 自定义字段模式
    function paint() {
      box.innerHTML = '';
      items.forEach(function (it, idx) {
        const row = mk('tpl-dyn-item-custom');
        $('.di-title', row).textContent = '第 ' + (idx + 1) + ' 条';
        const grid = $('.dyn-grid-custom', row);
        fields.forEach(function (f) {
          let el;
          if (f.source === 'entrances') {
            // 关联安检点
            el = document.createElement('select');
            el.className = 'select';
            el.style.minHeight = '42px';
            el.setAttribute('aria-label', '第' + (idx + 1) + '条' + f.key);
            const ph = document.createElement('option');
            ph.value = ''; ph.textContent = '请选择' + f.key;
            el.appendChild(ph);
            (data.settings.entrances || []).filter(Boolean).forEach(function (e) {
              const o = document.createElement('option');
              o.value = e; o.textContent = e;
              el.appendChild(o);
            });
            el.value = it[f.key] || '';
            el.addEventListener('change', function () {
              it[f.key] = el.value;
              queuePreview();
            });
          } else if (f.source === 'groups') {
            // 关联群名
            el = document.createElement('select');
            el.className = 'select';
            el.style.minHeight = '42px';
            el.setAttribute('aria-label', '第' + (idx + 1) + '条' + f.key);
            const ph = document.createElement('option');
            ph.value = ''; ph.textContent = '请选择' + f.key;
            el.appendChild(ph);
            (data.settings.groups || []).filter(Boolean).forEach(function (g) {
              const o = document.createElement('option');
              o.value = g; o.textContent = g;
              el.appendChild(o);
            });
            el.value = it[f.key] || '';
            el.addEventListener('change', function () {
              it[f.key] = el.value;
              queuePreview();
            });
          } else {
            // 普通文本/数字/日期/时间输入
            el = document.createElement('input');
            el.className = 'input';
            if (f.type === 'date') {
              el.type = 'date';
            } else if (f.type === 'time') {
              el.type = 'text';
              el.inputMode = 'numeric';
              el.placeholder = f.key + ' (如 08:30 或 830)';
              // 失焦时自动规范化为 08:30 格式
              el.addEventListener('blur', function () {
                const n = normalizeTime(el.value);
                el.value = n || '';
                it[f.key] = el.value;
                queuePreview();
              });
            } else if (f.type === 'number') {
              el.type = 'number';
              el.inputMode = 'numeric';
              el.placeholder = f.key;
            } else {
              el.type = 'text';
              el.inputMode = 'text';
              el.placeholder = f.key;
            }
            el.value = it[f.key] || '';
            el.setAttribute('aria-label', '第' + (idx + 1) + '条' + f.key);
            el.style.minHeight = '42px';
            el.addEventListener('input', function () {
              it[f.key] = el.value;
              queuePreview();
            });
          }
          grid.appendChild(el);
        });
        $('.di-del', row).addEventListener('click', function () {
          items.splice(idx, 1);
          syncCount(); paint(); queuePreview();
        });
        box.appendChild(row);
      });
      addBtn.hidden = false;
      addBtn.textContent = items.length ? '再加一条' : '添加第一条';
      clearBtn.style.display = items.length ? '' : 'none';
    }
    function syncCount() { $('.stepper-input', stepper).value = String(items.length); }
    bindStepper(stepper, {
      min: 0, max: 99,
      onChange: function (v) {
        while (items.length < v) {
          const item = {};
          fields.forEach(function (f) { item[f.key] = ''; });
          items.push(item);
        }
        if (items.length > v) items.length = v;
        syncCount(); paint(); queuePreview();
      }
    });
    addBtn.addEventListener('click', function () {
      const item = {};
      fields.forEach(function (f) { item[f.key] = ''; });
      items.push(item);
      syncCount(); paint(); queuePreview();
      const first = box.lastElementChild.querySelector('input');
      if (first) { try { first.focus({ preventScroll: false }); } catch (e) {} }
    });
    const clearBtn = $('.items-clear', node);
    clearBtn.addEventListener('click', function () {
      if (!items.length) return;
      items.length = 0;
      syncCount(); paint(); queuePreview();
    });
    syncCount();
    paint();
    clearBtn.style.display = items.length ? '' : 'none';
    return node;
  }

  // 默认字段模式（兼容旧数据）
  const methods = data.settings.dispatchOptions.slice();
  function paint() {
    box.innerHTML = '';
    items.forEach(function (it, idx) {
      const row = mk('tpl-dyn-item');
      $('.di-title', row).textContent = '第 ' + (idx + 1) + ' 件';
      const n = $('.di-name', row), sp = $('.di-spec', row), nt = $('.di-note', row), sel = $('.di-method', row);
      n.value = it.name || ''; sp.value = it.spec || ''; nt.value = it.note || '';
      n.setAttribute('aria-label', '第' + (idx + 1) + '件物品名称');
      sp.setAttribute('aria-label', '第' + (idx + 1) + '件规格数量');
      nt.setAttribute('aria-label', '第' + (idx + 1) + '件备注');
      sel.setAttribute('aria-label', '第' + (idx + 1) + '件处置方式');
      const ph = document.createElement('option'); ph.value = ''; ph.textContent = '处置方式';
      sel.appendChild(ph);
      methods.forEach(function (m) { const o = document.createElement('option'); o.value = m; o.textContent = m; sel.appendChild(o); });
      sel.value = it.method || '';
      n.addEventListener('input', function () { it.name = n.value; queuePreview(); });
      sp.addEventListener('input', function () { it.spec = sp.value; queuePreview(); });
      nt.addEventListener('input', function () { it.note = nt.value; queuePreview(); });
      sel.addEventListener('change', function () { it.method = sel.value; queuePreview(); });
      $('.di-count', row).value = String(parseInt(it.count, 10) || 1);
      bindStepper($('.di-count-wrap', row), {
        min: 1, max: 999,
        onChange: function (v) { it.count = String(v); queuePreview(); }
      });
      $('.di-del', row).addEventListener('click', function () {
        items.splice(idx, 1);
        syncCount(); paint(); queuePreview();
      });
      box.appendChild(row);
    });
    addBtn.hidden = false;
    addBtn.textContent = items.length ? '再加一件' : '添加第一件';
    clearBtn.style.display = items.length ? '' : 'none';
  }
  function syncCount() { $('.stepper-input', stepper).value = String(items.length); }
  bindStepper(stepper, {
    min: 0, max: 99,
    onChange: function (v) {
      while (items.length < v) items.push({ name: '', spec: '', count: '1', method: methods[0] || '', note: '' });
      if (items.length > v) items.length = v;
      syncCount(); paint(); queuePreview();
    }
  });
  addBtn.addEventListener('click', function () {
    items.push({ name: '', spec: '', count: '1', method: methods[0] || '', note: '' });
    syncCount(); paint(); queuePreview();
    const last = $('.di-name', box.lastElementChild);
    if (last) { try { last.focus({ preventScroll: false }); } catch (e) {} }
  });
  const clearBtn = $('.items-clear', node);
  clearBtn.addEventListener('click', function () {
    if (!items.length) return;
    items.length = 0;
    syncCount(); paint(); queuePreview();
  });
  syncCount();
  paint();
  clearBtn.style.display = items.length ? '' : 'none';
  return node;
}

export function renderForm() {
  const area = $('#formArea');
  area.innerHTML = '';
  const tpl = tplById(currentTplId);
  if (!tpl) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = '请选择或新建一个模板';
    area.appendChild(e);
    return;
  }
  const vars = visibleVars(tpl);
  if (!vars.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    const all = extractVars(tpl.content);
    e.textContent = all.length ? '所有变量都已通过「设置」自动填充,直接复制即可' : '这个模板还没有变量,用 *变量名* 标记即可自动生成输入框';
    area.appendChild(e);
    return;
  }
  const frag = document.createDocumentFragment();
  vars.forEach(function (name) {
    const node = buildField(tpl, name);
    if (node) node.dataset.var = name;    // 便于按变量名刷新对应控件
    frag.appendChild(node);
  });
  area.appendChild(frag);
}

export function queuePreview() {
  saveFormCacheThrottled();
  if (previewQueued) return;
  previewQueued = true;
  requestAnimationFrame(function () { previewQueued = false; renderPreview(); });
}

export const saveFormCacheThrottled = debounce(saveFormCache, 600);

export function renderPreview() {
  const tpl = tplById(currentTplId);
  const box = $('#previewBox'), cnt = $('#previewCount'), stamp = $('#previewStamp'), tname = $('#previewTpl');
  if (!tpl) {
    box.className = 'preview placeholder';
    box.textContent = '选择模板并填写内容,结果实时显示在这里';
    cnt.textContent = '0 字'; tname.textContent = ''; stamp.textContent = '';
    return;
  }
  const out = renderTemplate(tpl, values);
  tname.textContent = tpl.name;
  if (!out.trim()) {
    box.className = 'preview placeholder';
    box.textContent = '填写内容后,这里会实时生成可发送的文本';
    cnt.textContent = '0 字';
    stamp.textContent = '';
    return;
  }
  box.className = 'preview';
  box.textContent = out;
  cnt.textContent = out.replace(/\s/g, '').length + ' 字';
  const miss = missingVars(tpl, values);
  stamp.textContent = miss.length ? ('待填:' + miss.slice(0, 3).join('、') + (miss.length > 3 ? ' 等' + miss.length + '项' : '')) : '已填完整';
  stamp.style.color = miss.length ? 'var(--warn)' : 'var(--success)';
}

export function currentText() {
  const box = $('#previewBox');
  if (box.classList.contains('placeholder')) return '';
  return box.textContent || '';
}
/* 把未被手动改过的日期/时间变量刷新为当前值,并同步到界面 */

export let lastRefreshMin = -1;

export function refreshDatetimeFields() {
  const tpl = tplById(currentTplId);
  if (!tpl) return;
  let changed = false;
  extractVars(tpl.content).forEach(function (name) {
    const type = varType(tpl, name);
    if (type !== 'time' && type !== 'date') return;
    if (touchedVars[name]) return;
    if (presetValue(name)) return;
    const v = defaultByType(name, type);
    if (String(values[name] == null ? '' : values[name]) !== v) {
      values[name] = v;
      changed = true;
    }
  });
  if (!changed) return;
  $$('#formArea [data-var]').forEach(function (node) {
    const name = node.dataset.var;
    if (touchedVars[name]) return;
    const type = varType(tpl, name);
    if (type !== 'time' && type !== 'date') return;
    const input = node.querySelector('input');
    if (!input) return;
    input.value = type === 'time' ? (normalizeTime(values[name]) || '') : (values[name] || '');
  });
  saveFormCache();
  renderPreview();
}

export function maybeRefreshDatetime() {
  const d = new Date();
  const m = d.getHours() * 60 + d.getMinutes();
  if (m === lastRefreshMin) return;
  lastRefreshMin = m;
  refreshDatetimeFields();
}



export function snapshotValues(tpl, vals) {
  const out = {};
  if (!tpl) return out;
  extractVars(tpl.content).forEach(function (name) {
    const type = varType(tpl, name);
    if (presetValue(name)) return;
    if (type === 'date' || type === 'time') return;
    if (type === 'items') { out[name + '__items'] = deepCopy(vals[name + '__items'] || []); return; }
    if (name in vals) out[name] = vals[name];
  });
  return out;
}

export async function doCopy(text, btn, labelEl) {
  if (!text) { toast('暂无内容可复制'); return; }
  const ok = await copyText(text);
  if (ok) {
    if (btn) flashButton(btn, labelEl, '已复制');
    toast('已复制到剪贴板');
    addHistory(text, tplById(currentTplId), snapshotValues(tplById(currentTplId), values));
  } else {
    toast('复制失败,请长按预览框手动选择复制');
  }
}



export function linkedTplIds() {
  const d = new Date();
  const nowMin = d.getHours() * 60 + d.getMinutes();
  const cur = sortedTimeline().filter(function (i) { return statusOf(i, nowMin) === 'current'; })[0];
  return (cur && Array.isArray(cur.tplIds)) ? cur.tplIds : [];
}
/* 根据当前时间,自动切到进行中任务绑定的模板;多模板取第一个 */

export function applyTimelineTpl() {
  const cur = linkedTplIds();
  if (!cur.length) return false;
  const first = tplById(cur[0]);
  if (!first) return false;
  if (currentTplId && cur.indexOf(currentTplId) >= 0) return false;
  currentTplId = first.id;
  return true;
}

export function historyVarPattern(tpl, name, loose) {
  const type = varType(tpl, name);
  if (type === 'items') return null;
  // 线路/站点/班长/电话这类自动带入的变量,按设置里的实际值锚定,
  // 否则宽松匹配时相邻变量会把它们的文字一起吞掉(如把线路站点连进安检点的取值)
  const pv = presetValue(name);
  if (pv) return '(?:' + escapeRe(pv) + ')?';   // 历史里可能省略线路等前缀,允许缺席
  if (type === 'date') {
    if (['年', '月', '日'].indexOf(name) >= 0) return '\\d{1,4}';
    return '(?:\\d{4}年\\d{1,2}月\\d{1,2}日|\\d{4}-\\d{1,2}-\\d{1,2})';
  }
  if (type === 'time') return '(?:\\d{1,2}:\\d{2}|\\d{3,4})';
  if (type === 'number') return '\\d+(?:\\.\\d+)?';
  if (['entrance', 'entrances', 'member', 'members', 'single'].indexOf(type) >= 0) {
    // 先按当前名单/选项精确匹配;对不上时(人员变动、旧工号)再用宽松模式兜一轮
    const opts = loose ? [] : varOptions(tpl, name);
    if (opts.length) {
      return '(?:' + opts.slice().sort(function (a, b) { return b.length - a.length; }).map(escapeRe).join('|') + ')';
    }
    if (type === 'entrance' || type === 'entrances') return '[^\\n，,。；;]{1,12}?';
    if (type === 'member' || type === 'members') return '[^\\n，,。；;]{1,24}?';
    if (type === 'single') return '[^\\n]*?';
  }
  return '[\\s\\S]*?';
}

export function historyLiteralRe(t) {
  // 生成文本时行尾空白会被压掉,这里把空格放宽,换行仍按原样对齐
  return escapeRe(t).replace(/[ \t]+/g, '[ \\t]*');
}

export function historyTemplateRegex(tpl, loose) {
  const names = [];
  let failed = false;
  const src = String(tpl.content).split('\n').map(function (l) { return l.replace(/\s+$/, ''); }).join('\n')
    .replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n+$/, '');
  function build(text) {
    let out = '', i = 0, m;
    const re = /\{\?([^}]+)\}([\s\S]*?)\{\/\1\}|\*([^*\n]+)\*/g;
    while ((m = re.exec(text)) !== null) {
      out += historyLiteralRe(text.slice(i, m.index));
      if (m[1] != null) {
        out += '(?:' + build(m[2]) + ')?';
      } else {
        const name = m[3].trim();
        const p = historyVarPattern(tpl, name, loose);
        if (p == null) failed = true;
        names.push(name);
        out += '(' + (p == null ? '[\\s\\S]*?' : p) + ')';
      }
      i = m.index + m[0].length;
    }
    out += historyLiteralRe(text.slice(i));
    return out;
  }
  const body = build(src);
  if (failed) return null;
  try { return { re: new RegExp('^' + body + '$'), names: names }; }
  catch (e) { return null; }
}

export function matchHistory(tpl, text, loose) {
  const built = historyTemplateRegex(tpl, loose);
  if (!built) return null;
  const m = built.re.exec(String(text));
  if (!m) return null;
  const out = {};
  built.names.forEach(function (name, i) {
    const raw = m[i + 1];
    if (raw == null) return;
    const v = String(raw).trim();
    if (!v) return;
    if (presetValue(name)) return;                       // 基本信息由设置自动带入
    const type = varType(tpl, name);
    if (type === 'date' || type === 'time') return;      // 日期时间统一刷新为当前
    if (name in out) return;                             // 同名变量多处出现,取第一处
    out[name] = v;
  });
  return { ok: true, values: out, loose: !!loose };
}

export function parseHistoryToValues(tpl, text) {
  if (!tpl || !tpl.content || !text) return { ok: false, values: {} };
  return matchHistory(tpl, text, false) || matchHistory(tpl, text, true) || { ok: false, values: {} };
}

export function resetDatetimeVars(tpl) {
  extractVars(tpl.content).forEach(function (name) {
    const type = varType(tpl, name);
    if (type === 'date' || type === 'time') values[name] = defaultByType(name, type);
  });
}

export let editingId = null;

export function openManageSheet() {
  let dirty = false;
  const bodyNode = document.createElement('div');
  const listBox = document.createElement('div');
  const editorBox = document.createElement('div');
  editorBox.style.marginTop = '14px';
  editorBox.style.borderTop = '1px solid var(--border)';
  editorBox.style.paddingTop = '14px';
  bodyNode.appendChild(listBox); bodyNode.appendChild(editorBox);
  function paintList() {
    listBox.innerHTML = '';
    if (!data.templates.length) {
      const e = document.createElement('div');
      e.className = 'empty';
      e.textContent = '还没有模板,点下方「新建模板」';
      listBox.appendChild(e);
      return;
    }
    data.templates.forEach(function (t, idx) {
      const node = mk('tpl-manage-item');
      const btn = $('.mi-name', node);
      btn.textContent = t.name + (t.group ? '(' + t.group + ')' : '');
      btn.setAttribute('aria-pressed', t.id === editingId ? 'true' : 'false');
      btn.addEventListener('click', function () {
        if (dirty) {
          Sheet.confirmSheet({
            title: '放弃未保存的修改?', message: '切换模板会丢失编辑器里未保存的内容。', okText: '放弃并切换', danger: true,
            onOk: function () { dirty = false; editingId = t.id; paintList(); paintEditor(); }
          });
          return;
        }
        editingId = t.id; paintList(); paintEditor();
      });
      const up = $('.mi-up', node), down = $('.mi-down', node);
      up.disabled = idx === 0; down.disabled = idx === data.templates.length - 1;
      up.addEventListener('click', function () { const p = data.templates[idx - 1]; data.templates[idx - 1] = data.templates[idx]; data.templates[idx] = p; save(); paintList(); renderTplChips(); });
      down.addEventListener('click', function () { const n = data.templates[idx + 1]; data.templates[idx + 1] = data.templates[idx]; data.templates[idx] = n; save(); paintList(); renderTplChips(); });
      $('.mi-del', node).addEventListener('click', function () {
        Sheet.confirmSheet({
          title: '删除「' + t.name + '」?', message: '删除后无法恢复,已生成的历史记录仍会保留。', okText: '删除', danger: true,
          onOk: function () {
            data.templates = data.templates.filter(function (x) { return x.id !== t.id; });
            delete data.formCache[t.id];
            if (editingId === t.id) editingId = data.templates.length ? data.templates[0].id : null;
            if (currentTplId === t.id) currentTplId = data.templates.length ? data.templates[0].id : null;
            save(); paintList(); paintEditor(); renderTplChips();
            if (currentTplId) selectTemplate(currentTplId); else { values = {}; renderForm(); renderPreview(); }
            toast('已删除');
          }
        });
      });
      listBox.appendChild(node);
    });
  }
  function paintEditor() {
    editorBox.innerHTML = '';
    const t = tplById(editingId);
    if (!t) {
      const e = document.createElement('div');
      e.className = 'empty';
      e.textContent = '选择上方模板进行编辑,或新建一个';
      editorBox.appendChild(e);
      return;
    }
    const nameIn = document.createElement('input');
    nameIn.className = 'input'; nameIn.type = 'text'; nameIn.placeholder = '模板名称';
    nameIn.value = t.name; nameIn.style.marginBottom = '9px';
    nameIn.setAttribute('aria-label', '模板名称');
    const row = document.createElement('div');
    row.className = 'inline-2';
    row.style.marginBottom = '9px';
    const groupIn = document.createElement('input');
    groupIn.className = 'input'; groupIn.type = 'text'; groupIn.placeholder = '分组(选填)';
    groupIn.value = t.group || '';
    groupIn.setAttribute('aria-label', '模板分组');
    // 发往群名：多选 chips
    const hintWrap = document.createElement('div');
    hintWrap.className = 'chip-group';
    hintWrap.setAttribute('aria-label', '发往群名(多选)');
    const selectedGroups = Array.isArray(t.groupHint) ? t.groupHint : [];
    (data.settings.groups || []).filter(Boolean).forEach(function (g) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = g;
      chip.setAttribute('aria-pressed', selectedGroups.indexOf(g) >= 0 ? 'true' : 'false');
      chip.addEventListener('click', function () {
        const on = chip.getAttribute('aria-pressed') === 'true';
        chip.setAttribute('aria-pressed', on ? 'false' : 'true');
        dirty = true;
      });
      hintWrap.appendChild(chip);
    });
    if (!hintWrap.children.length) {
      const note = document.createElement('span');
      note.className = 'section-note';
      note.textContent = '还没配置群名,去设置页添加';
      hintWrap.appendChild(note);
    }
    row.appendChild(groupIn); row.appendChild(hintWrap);
    const lab = document.createElement('div');
    lab.className = 'field-label';
    const span = document.createElement('span');
    span.className = 'fl-name';
    span.textContent = '模板内容(用 *变量名* 标记占位)';
    lab.appendChild(span);
    const content = document.createElement('textarea');
    content.className = 'textarea';
    content.style.minHeight = '180px';
    content.value = t.content;
    content.placeholder = '例如:\n【违禁品查获上报】\n时间:*月**日* *发现时间*\n地点:*线路* *站点* *安检点*\n查获 *违禁品件数* 件:\n*违禁品清单*\n{?备注}备注:*备注*{/备注}';
    content.setAttribute('aria-label', '模板内容');
    // 快速插入变量栏
    const quickBar = document.createElement('div');
    quickBar.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center';
    const quickLabel = document.createElement('span');
    quickLabel.className = 'section-note';
    quickLabel.textContent = '快速插入：';
    quickLabel.style.flex = 'none';
    quickBar.appendChild(quickLabel);
    const quickChips = document.createElement('div');
    quickChips.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap';
    quickBar.appendChild(quickChips);
    function paintQuickChips() {
      quickChips.innerHTML = '';
      const vars = extractVars(content.value);
      if (!vars.length) {
        const note = document.createElement('span');
        note.className = 'section-note';
        note.textContent = '在下方写 *变量名* 后会自动出现';
        quickChips.appendChild(note);
        return;
      }
      vars.forEach(function (v) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.style.cssText = 'font-size:.75rem;min-height:30px;padding:3px 10px';
        chip.textContent = '+' + v;
        chip.title = '点击在光标处插入 *' + v + '*';
        chip.addEventListener('click', function () {
          const start = content.selectionStart;
          const end = content.selectionEnd;
          const ins = '*' + v + '*';
          content.value = content.value.slice(0, start) + ins + content.value.slice(end);
          content.selectionStart = content.selectionEnd = start + ins.length;
          content.focus();
          content.dispatchEvent(new Event('input'));
        });
        quickChips.appendChild(chip);
      });
    }
    paintQuickChips();
    content.addEventListener('input', debounce(paintQuickChips, 300));
    const vtWrap = document.createElement('div');
    vtWrap.style.marginTop = '12px';
    function paintVarTypes() {
      vtWrap.innerHTML = '';
      const vars = extractVars(content.value).filter(function (n) {
        return ['年', '月', '日'].indexOf(n) < 0 && !presetValue(n);
      });
      // 应用自定义排序
      if (t.varOrder && t.varOrder.length) {
        vars.sort(function (a, b) {
          const ai = t.varOrder.indexOf(a);
          const bi = t.varOrder.indexOf(b);
          if (ai < 0 && bi < 0) return 0;
          if (ai < 0) return 1;
          if (bi < 0) return -1;
          return ai - bi;
        });
      }
      const head = document.createElement('div');
      head.className = 'field-label';
      const hs = document.createElement('span');
      hs.className = 'fl-name';
      hs.textContent = '变量与类型(' + vars.length + ')';
      head.appendChild(hs);
      vtWrap.appendChild(head);
      if (!vars.length) {
        const e = document.createElement('p');
        e.className = 'section-note';
        e.textContent = '还没有识别到变量,在内容里写 *变量名* 即可自动生成输入框';
        vtWrap.appendChild(e);
        return;
      }
      vars.forEach(function (name, idx) {
        const node = mk('tpl-vartype-row');
        $('.vt-name', node).textContent = name;
        const sel = $('.vt-type', node);
        const declared = t.varTypes[name] || {};
        sel.value = declared.type || inferType(name);
        const optInput = $('.vt-options', node);
        function syncOpt() {
          const needOpt = sel.value === 'single' || sel.value === 'multi';
          optInput.hidden = !needOpt;
          if (needOpt) {
            optInput.value = (declared.options && declared.options.length) ? declared.options.join('|') : varOptions(t, name).join('|');
          }
        }
        syncOpt();
        sel.addEventListener('change', function () {
          if (!t.varTypes[name]) t.varTypes[name] = {};
          t.varTypes[name].type = sel.value;
          dirty = true; syncOpt();
          paintFieldsConfig();
        });
        optInput.addEventListener('input', function () {
          if (!t.varTypes[name]) t.varTypes[name] = {};
          t.varTypes[name].options = optInput.value.split('|').map(function (x) { return x.trim(); }).filter(Boolean);
          dirty = true;
        });
        vtWrap.appendChild(node);
        // 排序按钮
        const sortDiv = document.createElement('div');
        sortDiv.style.cssText = 'display:flex;gap:4px;margin:-4px 0 8px;justify-content:flex-end';
        const upBtn = document.createElement('button');
        upBtn.type = 'button'; upBtn.className = 'mini-btn'; upBtn.textContent = '↑';
        upBtn.disabled = idx === 0;
        upBtn.addEventListener('click', function () {
          if (!t.varOrder) t.varOrder = vars.slice();
          const ci = t.varOrder.indexOf(name);
          if (ci > 0) {
            const tmp = t.varOrder[ci - 1];
            t.varOrder[ci - 1] = t.varOrder[ci];
            t.varOrder[ci] = tmp;
            dirty = true;
            paintVarTypes();
          }
        });
        const downBtn = document.createElement('button');
        downBtn.type = 'button'; downBtn.className = 'mini-btn'; downBtn.textContent = '↓';
        downBtn.disabled = idx === vars.length - 1;
        downBtn.addEventListener('click', function () {
          if (!t.varOrder) t.varOrder = vars.slice();
          const ci = t.varOrder.indexOf(name);
          if (ci >= 0 && ci < t.varOrder.length - 1) {
            const tmp = t.varOrder[ci + 1];
            t.varOrder[ci + 1] = t.varOrder[ci];
            t.varOrder[ci] = tmp;
            dirty = true;
            paintVarTypes();
          }
        });
        sortDiv.appendChild(upBtn);
        sortDiv.appendChild(downBtn);
        vtWrap.appendChild(sortDiv);
      });
      // 物品清单字段配置
      const fieldsWrap = document.createElement('div');
      fieldsWrap.id = 'fieldsConfigWrap';
      vtWrap.appendChild(fieldsWrap);
      function paintFieldsConfig() {
        fieldsWrap.innerHTML = '';
        vars.forEach(function (name) {
          const declared = t.varTypes[name] || {};
          if ((declared.type || inferType(name)) !== 'items') return;
          const label = document.createElement('div');
          label.className = 'field-label';
          label.style.marginTop = '12px';
          label.textContent = '「' + name + '」的字段配置';
          fieldsWrap.appendChild(label);
          const fieldsBox = document.createElement('div');
          fieldsBox.id = 'fieldsBox-' + name;
          fieldsWrap.appendChild(fieldsBox);
          const addFieldBtn = document.createElement('button');
          addFieldBtn.type = 'button'; addFieldBtn.className = 'btn btn-ghost btn-sm';
          addFieldBtn.textContent = '+ 添加字段';
          addFieldBtn.addEventListener('click', function () {
            if (!t.varTypes[name]) t.varTypes[name] = {};
            if (!t.varTypes[name].fields) t.varTypes[name].fields = [];
            t.varTypes[name].fields.push({ key: '新字段', type: 'text', sum: false });
            dirty = true;
            paintFieldsConfig();
          });
          fieldsWrap.appendChild(addFieldBtn);
          const fields = t.varTypes[name].fields || [];
          fields.forEach(function (f, fi) {
            const frow = document.createElement('div');
            frow.className = 'list-row';
            frow.style.padding = '6px 0';
            const keyInp = document.createElement('input');
            keyInp.className = 'input';
            keyInp.type = 'text';
            keyInp.value = f.key;
            keyInp.placeholder = '字段名';
            keyInp.style.flex = '2';
            keyInp.style.minHeight = '40px';
            keyInp.addEventListener('input', function () { f.key = keyInp.value; dirty = true; });
            const typeSel = document.createElement('select');
            typeSel.className = 'select';
            typeSel.style.width = 'auto';
            typeSel.style.minWidth = '80px';
            typeSel.style.minHeight = '40px';
            ['text', 'number', 'date', 'time'].forEach(function (tt) {
            const o = document.createElement('option');
            o.value = tt; 
            o.textContent = tt === 'text' ? '文本' : (tt === 'number' ? '数字' : (tt === 'date' ? '日期' : '时间'));
            if (f.type === tt) o.selected = true;
            typeSel.appendChild(o);
          });
            typeSel.addEventListener('change', function () { f.type = typeSel.value; dirty = true; });
            // 关联来源选择
            const sourceSel = document.createElement('select');
            sourceSel.className = 'select';
            sourceSel.style.width = 'auto';
            sourceSel.style.minWidth = '90px';
            sourceSel.style.minHeight = '40px';
            [['', '手动输入'], ['entrances', '安检点'], ['groups', '群名']].forEach(function (s) {
              const o = document.createElement('option');
              o.value = s[0]; o.textContent = s[1];
              if ((f.source || '') === s[0]) o.selected = true;
              sourceSel.appendChild(o);
            });
            sourceSel.addEventListener('change', function () { f.source = sourceSel.value; dirty = true; });
            const sumLabel = document.createElement('label');
            sumLabel.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:.8rem;color:var(--text-2);cursor:pointer;flex:none';
            const sumChk = document.createElement('input');
            sumChk.type = 'checkbox';
            sumChk.checked = !!f.sum;
            sumChk.addEventListener('change', function () { f.sum = sumChk.checked; dirty = true; });
            sumLabel.appendChild(sumChk);
            sumLabel.appendChild(document.createTextNode('求和'));
            const delBtn = document.createElement('button');
            delBtn.type = 'button'; delBtn.className = 'mini-btn danger';
            delBtn.textContent = '删除';
            delBtn.addEventListener('click', function () {
              fields.splice(fi, 1);
              dirty = true;
              paintFieldsConfig();
            });
            frow.appendChild(keyInp);
            frow.appendChild(typeSel);
            frow.appendChild(sourceSel);
            frow.appendChild(sumLabel);
            frow.appendChild(delBtn);
            fieldsBox.appendChild(frow);
          });
          if (!fields.length) {
            const note = document.createElement('p');
            note.className = 'section-note';
            note.textContent = '还没有字段，点「添加字段」开始配置';
            fieldsBox.appendChild(note);
          }
          // 字段排序按钮
          if (fields.length > 1) {
            const sortRow = document.createElement('div');
            sortRow.style.cssText = 'display:flex;gap:4px;margin-top:6px;flex-wrap:wrap';
            fields.forEach(function (f, fi) {
              const chip = document.createElement('span');
              chip.className = 'chip';
              chip.style.cssText = 'font-size:.75rem;min-height:32px;padding:4px 8px';
              chip.textContent = f.key;
              const upB = document.createElement('button');
              upB.type = 'button'; upB.className = 'mini-btn'; upB.textContent = '↑';
              upB.style.cssText = 'min-height:28px;min-width:28px;padding:0;font-size:.7rem;margin-left:3px';
              upB.disabled = fi === 0;
              upB.addEventListener('click', function () {
                const tmp = fields[fi - 1]; fields[fi - 1] = fields[fi]; fields[fi] = tmp;
                dirty = true; paintFieldsConfig();
              });
              const dnB = document.createElement('button');
              dnB.type = 'button'; dnB.className = 'mini-btn'; dnB.textContent = '↓';
              dnB.style.cssText = 'min-height:28px;min-width:28px;padding:0;font-size:.7rem';
              dnB.disabled = fi === fields.length - 1;
              dnB.addEventListener('click', function () {
                const tmp = fields[fi + 1]; fields[fi + 1] = fields[fi]; fields[fi] = tmp;
                dirty = true; paintFieldsConfig();
              });
              const wrap = document.createElement('span');
              wrap.style.cssText = 'display:inline-flex;align-items:center;gap:2px';
              wrap.appendChild(chip); wrap.appendChild(upB); wrap.appendChild(dnB);
              sortRow.appendChild(wrap);
            });
            fieldsWrap.appendChild(sortRow);
          }
          // 行格式输入
          const fmtLabel = document.createElement('div');
          fmtLabel.className = 'field-label';
          fmtLabel.style.marginTop = '12px';
          fmtLabel.textContent = '行格式（选填）';
          fieldsWrap.appendChild(fmtLabel);
          const fmtInput = document.createElement('input');
          fmtInput.className = 'input';
          fmtInput.type = 'text';
          fmtInput.value = declared.rowFormat || '';
          fmtInput.placeholder = '如 *口名* 过机数:*过机数* 过门数:*过门数*';
          fmtInput.style.marginBottom = '4px';
          fmtInput.addEventListener('input', function () {
            if (!t.varTypes[name]) t.varTypes[name] = {};
            t.varTypes[name].rowFormat = fmtInput.value;
            dirty = true;
          });
          fieldsWrap.appendChild(fmtInput);
          const fmtNote = document.createElement('p');
          fmtNote.className = 'section-note';
          fmtNote.textContent = '用 *字段名* 引用字段值，留空则用默认格式（第一个字段无前缀，其余带前缀）';
          fieldsWrap.appendChild(fmtNote);
        });
      }
      paintFieldsConfig();
      const note = document.createElement('p');
      note.className = 'section-note';
      note.style.marginTop = '9px';
      note.textContent = '类型决定上报页生成什么控件:时间弹出时间选择器,单选多选生成按钮组,物品清单可配置自定义字段并自动汇总数字列。字段可关联「安检点」或「群名」实现下拉选择。用↑↓调整输入顺序。改完记得点下面的「保存模板」。';
      vtWrap.appendChild(note);
    }
    const debouncedVT = debounce(paintVarTypes, 320);
    content.addEventListener('input', function () { dirty = true; debouncedVT(); });
    nameIn.addEventListener('input', function () { dirty = true; });
    groupIn.addEventListener('input', function () { dirty = true; });
    editorBox.appendChild(nameIn);
    editorBox.appendChild(row);
    editorBox.appendChild(lab);
    editorBox.appendChild(content);
    editorBox.appendChild(quickBar);
    editorBox.appendChild(vtWrap);
    paintVarTypes();
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button'; saveBtn.className = 'btn btn-primary btn-block';
    saveBtn.style.marginTop = '14px';
    saveBtn.textContent = '保存模板';
    saveBtn.addEventListener('click', function () {
      t.name = nameIn.value.trim() || '未命名模板';
      t.group = groupIn.value.trim();
      // 收集选中的群名
      t.groupHint = Array.from(hintWrap.querySelectorAll('.chip[aria-pressed="true"]')).map(function (c) { return c.textContent; });
      t.content = content.value;
      t.builtin = false;
      t.updatedAt = Date.now();
      dirty = false;
      save();
      paintList(); renderTplChips();
      if (currentTplId === t.id) { values = {}; touchedVars = {}; selectTemplate(t.id); }
      toast('模板已保存');
    });
    editorBox.appendChild(saveBtn);
    const row2 = document.createElement('div');
    row2.className = 'btn-row';
    row2.style.marginTop = '9px';
    const dup = document.createElement('button');
    dup.type = 'button'; dup.className = 'btn'; dup.textContent = '复制为新模板';
    dup.addEventListener('click', function () {
      const nt = {
        id: uid(), name: t.name + '(副本)', group: t.group || '', groupHint: deepCopy(t.groupHint || []),
        content: t.content, varTypes: deepCopy(t.varTypes || {}), builtin: false, createdAt: Date.now(), updatedAt: Date.now()
      };
      data.templates.push(nt);
      editingId = nt.id; dirty = false;
      save(); paintList(); paintEditor(); renderTplChips();
      toast('已复制');
    });
    const use = document.createElement('button');
    use.type = 'button'; use.className = 'btn'; use.textContent = '在主界面使用';
    use.addEventListener('click', function () {
      currentTplId = t.id; data.lastTplId = t.id;
      values = {}; touchedVars = {}; ensureValues(t);
      dirty = false;
      save(); renderTplChips(); renderForm(); renderGroupHint(); renderPreview();
      Sheet.closeNow(); bus.emit('navigate','report');
    });
    row2.appendChild(dup); row2.appendChild(use);
    editorBox.appendChild(row2);
  }
  const footNode = document.createElement('div');
  footNode.className = 'btn-row';
  const addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'btn btn-primary'; addBtn.textContent = '新建模板';
  addBtn.addEventListener('click', function () {
    const t = {
      id: uid(), name: '新模板 ' + (data.templates.length + 1), group: '', groupHint: [],
      content: '', varTypes: {}, builtin: false, createdAt: Date.now(), updatedAt: Date.now()
    };
    data.templates.push(t);
    editingId = t.id; dirty = false;
    save(); paintList(); paintEditor(); renderTplChips();
    const first = editorBox.querySelector('input');
    if (first) { try { first.focus(); } catch (e) {} }
  });
  footNode.appendChild(addBtn);
  if (!editingId || !tplById(editingId)) editingId = currentTplId || (data.templates.length ? data.templates[0].id : null);
  paintList(); paintEditor();
  Sheet.open({
    title: '管理模板', bodyNode: bodyNode, footNode: footNode,
    dirty: function () { return dirty; },
    onClose: function () { dirty = false; renderTplChips(); }
  });
}

/* 把一段现成的上报文本反向做成模板:自动识别候选片段,可逐个确认或手动补选。
   每条候选 = 前文锚点 + 要替换的片段 + 后文锚点;替换时只动中间片段,锚点原样保留,
   避免「x6」里的 6 把全文所有 6 都换掉。已有 *变量* 一律保护,不参与识别与替换。 */

export function makerKey(r) { return (r.pre || '') + r.frag + (r.suf || ''); }

export function protectedRanges(text) {
  const out = [], re = /\*[^*\n]+\*/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push([m.index, m.index + m[0].length]);
  return out;
}

export function inRanges(ranges, a, b) {
  return ranges.some(function (r) { return a < r[1] && b > r[0]; });
}

export function detectCandidates(text) {
  const ranges = protectedRanges(text);
  const found = [];
  const st = data.settings;
  /* prio 越小优先级越高:同一起点上,语义明确的片段压过「括号备注」这类兜底识别 */
  function add(frag, name, type, prio, options, pre, suf) {
    if (!frag) return;
    pre = pre || ''; suf = suf || '';
    const key = pre + frag + suf;
    let at = text.indexOf(key);
    while (at >= 0) {
      const fs = at + pre.length;
      if (!inRanges(ranges, fs, fs + frag.length)) {
        found.push({ frag: frag, name: name, type: type, options: options || '', prio: prio, pre: pre, suf: suf, start: fs });
        return;
      }
      at = text.indexOf(key, at + 1);
    }
  }
  function addRe(re, name, type, prio, options, gi) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      const frag = m[gi == null ? 0 : gi];
      if (frag) {
        const off = m[0].indexOf(frag);
        const fs = m.index + off;
        if (!inRanges(ranges, fs, fs + frag.length)) {
          found.push({
            frag: frag, name: name, type: type, options: options || '', prio: prio,
            pre: m[0].slice(0, off), suf: m[0].slice(off + frag.length), start: fs
          });
        }
      }
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  // 人员:姓名＋工号优先,其次纯姓名
  const leaderName = String(st.leader || '').trim();
  (st.members || []).forEach(function (m) {
    if (!m.name) return;
    if (m.id) add(m.name + '（' + m.id + '）', '人员', 'member', 5);
    // 班长本人出现在「上报班长（…）」里时应识别为班长,不是复检员
    if (m.name !== leaderName) add(m.name, '人员', 'member', 6);
  });
  // 基本信息
  if (st.leaderPhone) add(String(st.leaderPhone).trim(), '电话号码', 'text', 8);
  if (st.leader) add(String(st.leader).trim(), '班长', 'text', 9);
  if (st.station) add(String(st.station).trim(), '站点', 'text', 10);
  if (st.line) add(String(st.line).trim(), '线路', 'text', 11);
  // 日期与时间
  addRe(/\d{4}年\d{1,2}月\d{1,2}日/g, '日期', 'date', 15);
  addRe(/\d{4}-\d{1,2}-\d{1,2}/g, '日期', 'date', 15);
  addRe(/\d{1,2}月\d{1,2}日/g, '日期', 'date', 16);
  addRe(/\d{1,2}:\d{2}/g, '时间', 'time', 17);
  addRe(/(\d{3,4})分(?!钟)/g, '时间', 'time', 18, '', 1);
  // 安检点:长的优先,避免 C1口 被 C口 抢先
  (st.entrances || []).filter(Boolean).slice().sort(function (a, b) { return b.length - a.length; })
    .forEach(function (e) { add(e, '安检点', 'entrance', 20); });
  // 已配置的自定义选项与处置选项
  (st.custom || []).forEach(function (c) {
    if (!c.key || (c.type !== 'single' && c.type !== 'multi')) return;
    String(c.value || '').split('|').map(function (x) { return x.trim(); }).filter(Boolean)
      .sort(function (a, b) { return b.length - a.length; })
      .forEach(function (opt) { add(opt, c.key, c.type, 25, String(c.value || '')); });
  });
  (st.dispatchOptions || []).filter(Boolean).forEach(function (opt) { add(opt, '处置结果', 'single', 26); });
  // 性别
  addRe(/([男女])(?=乘客)/g, '乘客性别', 'single', 30, '男|女', 1);
  // 物品名:取自速查的 A/B 类图像条目,含括号里的别名与常见前置修饰词
  const ITEM_MODS = ['玩具', '仿真', '工艺', '电动', '折叠', '超额', '超量', '儿童'];
  const seenItem = {};
  (data.lookup || []).forEach(function (r) {
    if (r.kind !== 'xa' && r.kind !== 'xb') return;
    const cands = [];
    String(r.name).split('/').forEach(function (part) {
      const al = part.match(/（([^）]+)）/);
      if (al) cands.push(al[1].trim());
      const base = part.replace(/（[^）]*）/g, '').trim();
      if (base) cands.push(base);
    });
    cands.forEach(function (nm) {
      if (!nm || nm.length > 8 || seenItem[nm]) return;
      seenItem[nm] = 1;
      const varName = r.kind === 'xa' ? '违禁品' : '限带品';
      let at = text.indexOf(nm);
      while (at >= 0) {
        let frag = nm, fs = at;
        const mod = text.slice(Math.max(0, at - 2), at);
        if (ITEM_MODS.indexOf(mod) >= 0) { frag = mod + nm; fs = at - 2; }
        if (!inRanges(ranges, fs, fs + frag.length)) {
          found.push({ frag: frag, name: varName, type: 'text', options: '', prio: 40, pre: '', suf: '', start: fs });
          break;
        }
        at = text.indexOf(nm, at + nm.length);
      }
    });
  });
  // 数量与括号备注:捕获组就是要替换的部分,前后文自动成为锚点
  addRe(/[x×X](\d+)/g, '物品数量', 'number', 50, '', 1);
  addRe(/(\d+)名/g, '人数', 'number', 51, '', 1);
  addRe(/(\d+)次/g, '次数', 'number', 52, '', 1);
  addRe(/(\d+)人/g, '人数', 'number', 53, '', 1);
  addRe(/(\d+)分钟/g, '时长', 'number', 54, '', 1);
  addRe(/[（(]([^（）()]{1,40})[）)]/g, '备注', 'text', 80, '', 1);
  // 去重叠:同一起点先比优先级,再比长度;只按真正要替换的片段判重叠
  found.sort(function (a, b) {
    return a.start - b.start || a.prio - b.prio || b.frag.length - a.frag.length;
  });
  const picked = [];
  found.forEach(function (f) {
    const end = f.start + f.frag.length;
    if (!f.frag) return;
    if (picked.some(function (p) { return f.start < p.start + p.frag.length && end > p.start; })) return;
    picked.push(f);
  });
  // 同一片段合并成一行,默认替换全部同名
  function countOf(key) {
    let n = 0, at = text.indexOf(key);
    while (at >= 0) { n++; at = text.indexOf(key, at + key.length); }
    return n;
  }
  const rows = [], byKey = {};
  picked.forEach(function (f) {
    const key = f.pre + f.frag + f.suf;
    if (byKey[key]) return;
    const row = {
      frag: f.frag, pre: f.pre, suf: f.suf, name: f.name, type: f.type, options: f.options,
      on: true, scope: 'all', count: countOf(key), start: f.start
    };
    byKey[key] = row;
    rows.push(row);
  });
  // 变量名去重:不同片段撞到同名时自动加序号
  const used = {};
  rows.forEach(function (r) {
    let nm = r.name, i = 2;
    while (used[nm]) { nm = r.name + i; i++; }
    used[nm] = 1;
    r.name = nm;
  });
  return rows;
}

export function buildTemplateFromRows(raw, rows) {
  const on = rows.filter(function (r) { return r.on && r.frag; });
  const used = {}, varTypes = {};
  on.forEach(function (r) {
    const base = (r.name || '').trim() || '变量';
    let nm = base, i = 2;
    while (used[nm]) { nm = base + i; i++; }
    used[nm] = 1;
    r.finalName = nm;
    const vt = { type: r.type };
    if ((r.type === 'single' || r.type === 'multi') && r.options) {
      vt.options = r.options.split('|').map(function (x) { return x.trim(); }).filter(Boolean);
    }
    varTypes[nm] = vt;
  });
  if (!on.length) return { content: raw, varTypes: {} };
  const sorted = on.slice().sort(function (a, b) { return makerKey(b).length - makerKey(a).length; });
  const map = {};
  sorted.forEach(function (r) { map[makerKey(r)] = r; });
  const re = new RegExp(sorted.map(function (r) { return escapeRe(makerKey(r)); }).join('|'), 'g');
  const ranges = protectedRanges(raw);
  const hit = {};
  const parts = [];
  let last = 0, m;
  while ((m = re.exec(raw)) !== null) {
    const r = map[m[0]];
    const fs = m.index + (r ? (r.pre || '').length : 0);
    const blocked = !r || inRanges(ranges, fs, fs + r.frag.length)
      || (r.scope === 'one' && hit[m[0]]);
    if (!blocked) {
      hit[m[0]] = 1;
      parts.push(raw.slice(last, m.index), (r.pre || '') + '*' + r.finalName + '*' + (r.suf || ''));
      last = m.index + m[0].length;
    }
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  parts.push(raw.slice(last));
  return { content: parts.join(''), varTypes: varTypes };
}

export function openTplMakerSheet(seedText, suggestName) {
  let raw = String(seedText || '');
  let rows = [];
  let resultTouched = false;
  const body = document.createElement('div');

  const tip = document.createElement('p');
  tip.className = 'section-note';
  tip.textContent = '把一段已经写好的上报文本粘进来,工具会标出可以换成变量的地方(日期、时间、站点、安检点、人员、物品、数量等)。确认后就是一条新模板。';
  body.appendChild(tip);

  const srcLabel = document.createElement('div');
  srcLabel.className = 'mk-sec';
  srcLabel.textContent = '第一步 · 现成文本';
  body.appendChild(srcLabel);
  const src = document.createElement('textarea');
  src.className = 'textarea mk-src';
  src.placeholder = '例如:\n【限带品查危简报】\n       2026年1月1日08:30，X号线XX站A口复检员张三（SZ00001）查出疑似B类物品……';
  src.value = raw;
  src.setAttribute('aria-label', '现成的上报文本');
  body.appendChild(src);
  const srcBtns = document.createElement('div');
  srcBtns.className = 'btn-row';
  srcBtns.style.marginTop = '9px';
  const scanBtn = document.createElement('button');
  scanBtn.type = 'button'; scanBtn.className = 'btn btn-primary'; scanBtn.textContent = '识别可替换内容';
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button'; clearBtn.className = 'btn'; clearBtn.textContent = '清空';
  srcBtns.appendChild(scanBtn); srcBtns.appendChild(clearBtn);
  body.appendChild(srcBtns);

  const rowSec = document.createElement('div');
  rowSec.className = 'mk-sec';
  rowSec.textContent = '第二步 · 确认要替换的内容';
  body.appendChild(rowSec);
  const rowBox = document.createElement('div');
  body.appendChild(rowBox);

  const manualSec = document.createElement('div');
  manualSec.className = 'mk-sec';
  manualSec.textContent = '手动补选(识别不到时用)';
  body.appendChild(manualSec);
  const mFrag = document.createElement('input');
  mFrag.className = 'input'; mFrag.type = 'text';
  mFrag.placeholder = '要替换的原文片段,如 玩具手铐';
  mFrag.style.marginBottom = '7px';
  mFrag.setAttribute('aria-label', '要替换的原文片段');
  const mGrid = document.createElement('div');
  mGrid.className = 'mk-grid';
  const mName = document.createElement('input');
  mName.className = 'input'; mName.type = 'text'; mName.placeholder = '变量名,如 违禁品';
  mName.setAttribute('aria-label', '变量名');
  const mType = document.createElement('select');
  mType.className = 'select';
  MAKER_TYPES.forEach(function (t) {
    const o = document.createElement('option');
    o.value = t[0]; o.textContent = t[1];
    mType.appendChild(o);
  });
  mGrid.appendChild(mName); mGrid.appendChild(mType);
  const mAdd = document.createElement('button');
  mAdd.type = 'button'; mAdd.className = 'btn btn-block'; mAdd.style.marginTop = '7px';
  mAdd.textContent = '添加替换';
  body.appendChild(mFrag); body.appendChild(mGrid); body.appendChild(mAdd);

  const resSec = document.createElement('div');
  resSec.className = 'mk-sec';
  resSec.textContent = '第三步 · 生成结果(可继续手动修改)';
  body.appendChild(resSec);
  const resNote = document.createElement('p');
  resNote.className = 'section-note';
  resNote.style.marginBottom = '7px';
  body.appendChild(resNote);
  const result = document.createElement('textarea');
  result.className = 'textarea mk-src';
  result.setAttribute('aria-label', '生成的模板内容');
  body.appendChild(result);
  const regen = document.createElement('button');
  regen.type = 'button'; regen.className = 'btn btn-block'; regen.style.marginTop = '7px';
  regen.textContent = '按上面的选择重新生成';
  regen.hidden = true;
  body.appendChild(regen);

  const infoSec = document.createElement('div');
  infoSec.className = 'mk-sec';
  infoSec.textContent = '第四步 · 模板信息';
  body.appendChild(infoSec);
  const nameIn = document.createElement('input');
  nameIn.className = 'input'; nameIn.type = 'text';
  nameIn.placeholder = '模板名称';
  nameIn.value = suggestName ? suggestName + '(新)' : '';
  nameIn.style.marginBottom = '7px';
  nameIn.setAttribute('aria-label', '模板名称');
  const groupIn = document.createElement('input');
  groupIn.className = 'input'; groupIn.type = 'text';
  groupIn.placeholder = '分组(选填),如 查违';
  groupIn.style.marginBottom = '9px';
  groupIn.setAttribute('aria-label', '模板分组');
  const hintWrap = document.createElement('div');
  hintWrap.className = 'chip-group';
  hintWrap.setAttribute('aria-label', '发往群名(多选)');
  (data.settings.groups || []).filter(Boolean).forEach(function (g) {
    const chip = document.createElement('button');
    chip.type = 'button'; chip.className = 'chip'; chip.textContent = g;
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', function () {
      chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
    hintWrap.appendChild(chip);
  });
  if (!hintWrap.children.length) {
    const n = document.createElement('span');
    n.className = 'section-note';
    n.textContent = '还没配置群名,可去设置页添加';
    hintWrap.appendChild(n);
  }
  body.appendChild(nameIn); body.appendChild(groupIn); body.appendChild(hintWrap);

  function contextOf(frag) {
    const at = raw.indexOf(frag);
    if (at < 0) return '';
    const a = Math.max(0, at - 10), b = Math.min(raw.length, at + frag.length + 10);
    return (a > 0 ? '…' : '') + raw.slice(a, b).replace(/\n/g, ' ') + (b < raw.length ? '…' : '');
  }
  function buildResult() { return buildTemplateFromRows(raw, rows); }
  function refreshResult() {
    const built = buildResult();
    if (!resultTouched) result.value = built.content;
    const on = rows.filter(function (r) { return r.on; });
    resNote.textContent = !on.length ? '还没有选择要替换的内容,生成结果就是原文。'
      : (resultTouched ? '已手动改过生成结果,上面的选择不会再覆盖它;需要时点下面「按上面的选择重新生成」。'
                       : '已选 ' + on.length + ' 处替换。这里也可以继续手动改,例如加 {?备注}…{/备注} 可选段。');
    return built;
  }
  function paintRows() {
    rowBox.innerHTML = '';
    if (!rows.length) {
      const e = document.createElement('div');
      e.className = 'tpl-list-empty';
      e.textContent = raw.trim() ? '点上面的「识别可替换内容」开始。' : '先粘贴一段现成文本。';
      rowBox.appendChild(e);
      return;
    }
    rows.forEach(function (r, idx) {
      const row = document.createElement('div');
      row.className = 'mk-row' + (r.on ? '' : ' off');
      const head = document.createElement('div');
      head.className = 'mk-row-head';
      const frag = document.createElement('span');
      frag.className = 'mk-frag';
      frag.textContent = makerKey(r);
      const sw = document.createElement('button');
      sw.type = 'button'; sw.className = 'mk-switch';
      sw.setAttribute('aria-pressed', r.on ? 'true' : 'false');
      sw.textContent = r.on ? '替换' : '不替换';
      sw.addEventListener('click', function () {
        r.on = !r.on;
        paintRows(); refreshResult();
      });
      head.appendChild(frag); head.appendChild(sw);
      row.appendChild(head);
      const ctx = document.createElement('div');
      ctx.className = 'section-note';
      ctx.style.marginBottom = '7px';
      ctx.textContent = ((r.pre || r.suf) ? '只把其中的「' + r.frag + '」换成变量。' : '')
        + contextOf(makerKey(r)) + (r.count > 1 ? '（全文出现 ' + r.count + ' 处）' : '');
      row.appendChild(ctx);
      const grid = document.createElement('div');
      grid.className = 'mk-grid';
      const nm = document.createElement('input');
      nm.className = 'input'; nm.type = 'text'; nm.value = r.name;
      nm.placeholder = '变量名';
      nm.setAttribute('aria-label', '变量名');
      nm.addEventListener('input', function () { r.name = nm.value; refreshResult(); });
      const tp = document.createElement('select');
      tp.className = 'select';
      tp.setAttribute('aria-label', '变量类型');
      MAKER_TYPES.forEach(function (t) {
        const o = document.createElement('option');
        o.value = t[0]; o.textContent = t[1];
        if (t[0] === r.type) o.selected = true;
        tp.appendChild(o);
      });
      tp.addEventListener('change', function () { r.type = tp.value; paintRows(); refreshResult(); });
      grid.appendChild(nm); grid.appendChild(tp);
      row.appendChild(grid);
      if (r.type === 'single' || r.type === 'multi') {
        const op = document.createElement('input');
        op.className = 'input'; op.type = 'text';
        op.style.cssText = 'min-height:40px;font-size:.82rem;padding:8px 10px;margin-top:7px';
        op.placeholder = '选项1|选项2|选项3';
        op.value = r.options || '';
        op.setAttribute('aria-label', '选项');
        op.addEventListener('input', function () { r.options = op.value; refreshResult(); });
        row.appendChild(op);
      }
      const meta = document.createElement('div');
      meta.className = 'mk-meta';
      const scopeLab = document.createElement('label');
      const scope = document.createElement('input');
      scope.type = 'checkbox';
      scope.checked = r.scope === 'all';
      scope.disabled = r.count < 2;
      scope.addEventListener('change', function () { r.scope = scope.checked ? 'all' : 'one'; refreshResult(); });
      scopeLab.appendChild(scope);
      scopeLab.appendChild(document.createTextNode(r.count > 1 ? '替换全部同名' : '仅 1 处'));
      meta.appendChild(scopeLab);
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'mini-btn danger';
      del.style.cssText = 'min-height:30px;font-size:.72rem';
      del.textContent = '移除';
      del.addEventListener('click', function () {
        rows.splice(idx, 1);
        paintRows(); refreshResult();
      });
      meta.appendChild(del);
      row.appendChild(meta);
      rowBox.appendChild(row);
    });
  }
  function scan() {
    raw = src.value;
    if (!raw.trim()) { toast('先粘贴一段现成文本'); return; }
    rows = detectCandidates(raw);
    resultTouched = false;
    regen.hidden = true;
    paintRows();
    const built = refreshResult();
    result.value = built.content;
    toast(rows.length ? '识别到 ' + rows.length + ' 处可替换内容' : '没识别到可替换内容,可用下面手动补选');
  }
  scanBtn.addEventListener('click', scan);
  clearBtn.addEventListener('click', function () {
    src.value = ''; raw = ''; rows = [];
    resultTouched = false; regen.hidden = true;
    paintRows(); refreshResult();
  });
  src.addEventListener('input', function () { raw = src.value; });
  result.addEventListener('input', function () {
    resultTouched = true;
    regen.hidden = false;
  });
  regen.addEventListener('click', function () {
    resultTouched = false; regen.hidden = true;
    refreshResult();
  });
  mAdd.addEventListener('click', function () {
    const frag = mFrag.value.trim();
    const nm = mName.value.trim();
    if (!frag) { toast('先填要替换的原文片段'); return; }
    if (!nm) { toast('先填变量名'); return; }
    if (raw.indexOf(frag) < 0) { toast('原文里找不到这个片段'); return; }
    if (rows.some(function (r) { return makerKey(r) === frag; })) { toast('这个片段已经在列表里了'); return; }
    let count = 0, at = raw.indexOf(frag);
    while (at >= 0) { count++; at = raw.indexOf(frag, at + frag.length); }
    rows.push({ frag: frag, pre: '', suf: '', name: nm, type: mType.value, options: '', on: true, scope: 'all', count: count, start: raw.indexOf(frag) });
    mFrag.value = ''; mName.value = '';
    paintRows(); refreshResult();
    toast('已添加');
  });

  const foot = document.createElement('div');
  foot.className = 'btn-row';
  const cancel = document.createElement('button');
  cancel.type = 'button'; cancel.className = 'btn'; cancel.textContent = '取消';
  cancel.addEventListener('click', function () { Sheet.requestClose(); });
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button'; saveBtn.className = 'btn btn-primary'; saveBtn.textContent = '保存为模板';
  saveBtn.addEventListener('click', function () {
    const content = result.value.trim();
    if (!content) { toast('生成结果是空的'); return; }
    const nm = nameIn.value.trim();
    if (!nm) { toast('先填模板名称'); nameIn.focus(); return; }
    const built = buildResult();
    const t = {
      id: uid(), name: nm, group: groupIn.value.trim(),
      groupHint: Array.from(hintWrap.querySelectorAll('.chip[aria-pressed="true"]')).map(function (c) { return c.textContent; }),
      content: result.value, varTypes: built.varTypes, varOrder: [],
      builtin: false, createdAt: Date.now(), updatedAt: Date.now()
    };
    data.templates.push(t);
    save();
    Sheet.closeNow();
    bus.emit('navigate','report');
    selectTemplate(t.id);
    renderTplChips();
    toast('模板「' + nm + '」已保存');
  });
  foot.appendChild(cancel); foot.appendChild(saveBtn);

  paintRows();
  refreshResult();
  if (raw.trim()) scan();
  Sheet.open({
    title: '制作模板', bodyNode: body, footNode: foot,
    dirty: function () { return !!result.value.trim() && !!raw.trim(); },
    autofocus: !raw
  });
}


export function itemCandidates(name) {
  const kinds = /违禁品/.test(name) ? ['xa'] : ['xb'];
  const seen = {}, out = [];
  (data.lookup || []).forEach(function (r) {
    if (kinds.indexOf(r.kind) < 0) return;
    String(r.name).split('/').forEach(function (part) {
      const cands = [];
      const al = part.match(/（([^）]+)）/);
      if (al) cands.push(al[1].trim());
      const base = part.replace(/（[^）]*）/g, '').trim();
      if (base) cands.push(base);
      cands.forEach(function (nm) {
        if (!nm || nm.length > 12 || seen[nm]) return;
        seen[nm] = 1;
        out.push({ name: nm, kind: r.kind });
      });
    });
  });
  return out;
}

export function buildItemCombo(node, input, tpl, name) {
  node.classList.add('cb-wrap');
  input.placeholder = '输入搜索速查,也可手输';
  input.value = values[name] || '';
  input.setAttribute('aria-label', name);
  const panel = document.createElement('div');
  panel.className = 'cb-panel';
  panel.hidden = true;
  const cands = itemCandidates(name);
  function renderOpts(q) {
    panel.innerHTML = '';
    const query = String(q || '').trim().toLowerCase();
    let list = cands.filter(function (c) { return !query || c.name.toLowerCase().indexOf(query) >= 0; });
    list = list.slice(0, 10);
    if (!list.length) {
      const e = document.createElement('div'); e.className = 'cb-empty';
      e.textContent = cands.length ? '没有匹配项,可直接手输' : '速查暂无该类物品,可直接手输';
      panel.appendChild(e); return;
    }
    list.forEach(function (c) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cb-opt';
      const k = document.createElement('span'); k.className = 'cb-kind'; k.textContent = c.kind === 'xa' ? 'A类' : 'B类';
      const nm = document.createElement('span'); nm.textContent = c.name; nm.style.flex = '1'; nm.style.minWidth = '0';
      b.appendChild(k); b.appendChild(nm);
      b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
      b.addEventListener('click', function () {
        input.value = c.name;
        values[name] = c.name;
        touchedVars[name] = true;
        queuePreview();
        panel.hidden = true;
      });
      panel.appendChild(b);
    });
  }
  input.addEventListener('input', function () {
    values[name] = input.value; touchedVars[name] = true; queuePreview();
    renderOpts(input.value); panel.hidden = false;
  });
  input.addEventListener('focus', function () { renderOpts(input.value); panel.hidden = false; });
  input.addEventListener('blur', function () { setTimeout(function () { panel.hidden = true; }, 160); });
  node.appendChild(panel);
}



export function refreshReport() {
  if (!currentTplId || !tplById(currentTplId)) {
    currentTplId = (data.lastTplId && tplById(data.lastTplId)) ? data.lastTplId : (data.templates.length ? data.templates[0].id : null);
  }
  if (currentTplId) selectTemplate(currentTplId);
  else { values = {}; touchedVars = {}; renderForm(); renderPreview(); renderGroupHint(); }
  renderTplChips();
}

export function openWithValues(tplId, vals) {
  const tpl = tplById(tplId);
  currentTplId = tplId; data.lastTplId = tplId;
  values = vals || loadFormCache(tplId);
  touchedVars = {};
  if (tpl) { ensureValues(tpl); resetDatetimeVars(tpl); }
  saveFormCache();
  renderForm(); renderGroupHint(); renderPreview(); renderTplChips();
}
export function openWithItem(r) {
  const field = r.kind === 'xa' ? '违禁品' : '限带品';
  const tpl = data.templates.find(function (t) { return extractVars(t.content).indexOf(field) >= 0; });
  if (!tpl) { toast('没有包含 *' + field + '* 变量的模板,先去「管理模板」添加'); return; }
  const itemName = String(r.name).split('/')[0].replace(/（[^）]*）/g, '').trim();
  bus.emit('navigate', 'report');
  selectTemplate(tpl.id);
  values[field] = itemName;
  touchedVars[field] = true;
  saveFormCache();
  renderForm(); renderGroupHint(); renderPreview(); renderTplChips();
  toast('已带入「' + itemName + '」,接着填其余几格');
}

export function resetForm() {
  const t = tplById(currentTplId);
  if (!t) { toast('请先选择模板'); return; }
  Sheet.confirmSheet({
    title: '重置填写内容?', message: '当前模板已填的内容会被清空,时间类变量会重新填为当前时间。', okText: '重置', danger: true,
    onOk: function () {
      values = {}; touchedVars = {};
      delete data.formCache[t.id];
      ensureValues(t);
      save(); renderForm(); renderPreview(); toast('已重置');
    }
  });
}
export function bindReport() {
  $('#btnManageTpl').addEventListener('click', openManageSheet);
  $('#btnMakeTpl').addEventListener('click', function () { openTplMakerSheet(''); });
  $('#btnToggleGroups').addEventListener('click', function () {
    if (collapsedGroups.size) collapsedGroups.clear();
    else { groupsOf().forEach(function (g) { collapsedGroups.add(g); }); collapsedGroups.add(''); }
    persistCollapsedGroups(); renderTplChips();
  });
  const tplSearchEl = $('#tplSearch');
  tplSearchEl.addEventListener('input', debounce(function () { tplQuery = tplSearchEl.value; renderTplChips(); }, 180));
  $('#btnCopyGroup').addEventListener('click', async function () {
    const t = tplById(currentTplId);
    const groups = t && Array.isArray(t.groupHint) ? t.groupHint.filter(Boolean) : [];
    if (!groups.length) { toast('这个模板没有设置群名'); return; }
    const text = groups.join('、');
    const ok = await copyText(text);
    toast(ok ? '群名已复制：' + text : '复制失败');
  });
  $('#btnCopy').addEventListener('click', copyWithCheck);
  $('#btnResetForm').addEventListener('click', resetForm);
}
