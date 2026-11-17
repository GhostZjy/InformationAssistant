import { $, debounce, deepCopy, el, mk, toast } from './core.js';
import { KIND_BADGE, KIND_CLS, KIND_LABEL, KIND_META } from './data.js';
import { openWithItem } from './report.js';
import { data, openImportSheet, save } from './store.js';
import { Sheet } from './ui.js';

export let lookupKind = '全部';

export let lookupQuery = '';
/* 速查分类注册表:新增分类只改这里,筛选栏、卡片配色、编辑器下拉全部自动跟随 */

export function highlightInto(host, text, q) {
  host.textContent = '';
  if (!q) { host.textContent = text; return; }
  const lower = text.toLowerCase(), needle = q.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const at = lower.indexOf(needle, i);
    if (at < 0) { host.appendChild(document.createTextNode(text.slice(i))); break; }
    if (at > i) host.appendChild(document.createTextNode(text.slice(i, at)));
    const m = document.createElement('mark');
    m.textContent = text.slice(at, at + needle.length);
    host.appendChild(m);
    i = at + needle.length;
  }
}

export function renderLookup() {
  const bar = $('#lookupFilterBar');
  bar.innerHTML = '';
  ['全部'].concat(KIND_META.map(function (m) { return m.label; })).forEach(function (k) {
    const c = mk('tpl-chip');
    c.textContent = k;
    c.setAttribute('aria-pressed', k === lookupKind ? 'true' : 'false');
    c.addEventListener('click', function () { lookupKind = k; renderLookup(); });
    bar.appendChild(c);
  });
  const box = $('#lookupList');
  box.innerHTML = '';
  // 旧版速查数据没有新增分类,给一个明确的升级入口,避免以为新内容没生效
  if (data.lookup.length && !data.lookup.some(function (r) { return r.kind === 'xa' || r.kind === 'duty'; })) {
    const tip = document.createElement('div');
    tip.className = 'group-hint';
    tip.style.marginBottom = '11px';
    const txt = document.createElement('span');
    txt.className = 'gh-text';
    txt.textContent = '当前速查仍是旧版内容,导入最新配置文件即可载入新版分类与全部条目。';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '导入配置';
    btn.addEventListener('click', openImportSheet);
    tip.appendChild(txt); tip.appendChild(btn);
    box.appendChild(tip);
  }
  const q = lookupQuery.trim();
  const rows = data.lookup.filter(function (r) {
    if (lookupKind !== '全部' && KIND_LABEL[r.kind] !== lookupKind) return false;
    if (!q) return true;
    const hay = (r.name + ' ' + r.items.join(' ') + ' ' + (r.warn || '')).toLowerCase();
    return hay.indexOf(q.toLowerCase()) >= 0;
  });
  if (!rows.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = data.lookup.length
      ? '没有匹配的条目,试试更短的关键词,如「刀」「酒」「电池」'
      : '速查内容为空。到「设置 → 导入配置」导入速查配置文件即可载入全部条目,也可以在设置页「速查内容 → 管理」里自行添加。';
    box.appendChild(e);
    return;
  }
  rows.forEach(function (r) {
    const node = mk('tpl-lookup-card');
    const kind = $('.lk-kind', node);
    kind.textContent = r.kindText;
    kind.className = 'lk-kind ' + (KIND_CLS[r.kind] || 'rule');
    highlightInto($('.lk-name', node), r.name, q);
    const ul = $('.lk-list', node);
    r.items.forEach(function (line) {
      const li = document.createElement('li');
      highlightInto(li, line, q);
      ul.appendChild(li);
    });
    if (r.warn) {
      const w = $('.lk-warn', node);
      w.hidden = false;
      highlightInto(w, r.warn, q);
    }
    const head = $('.lk-head', node);
    if (q) { node.classList.add('open'); head.setAttribute('aria-expanded', 'true'); }
    head.addEventListener('click', function () {
      const open = node.classList.toggle('open');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    if (r.kind === 'xa' || r.kind === 'xb') {
      const act = document.createElement('div'); act.className = 'lk-report';
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn-sm btn-primary'; b.textContent = '用这条上报';
      b.addEventListener('click', function () { openWithItem(r); });
      act.appendChild(b);
      $('.lk-body', node).appendChild(act);
    }
    box.appendChild(node);
  });
  const src = $('#lookupSource');
  src.textContent = '';
  data.lookupSource.forEach(function (s) {
    const p = document.createElement('div');
    p.style.marginBottom = '6px';
    p.textContent = s;
    src.appendChild(p);
  });
}



export function openLookupSheet() {
  let editing = false;
  const items = deepCopy(data.lookup);
  const bodyNode = document.createElement('div');
  const listBox = document.createElement('div');
  const editorHost = document.createElement('div');
  editorHost.style.cssText = 'margin-top:14px;border-top:1px solid var(--border);padding-top:14px';
  bodyNode.appendChild(listBox);
  bodyNode.appendChild(editorHost);

  function commit() { data.lookup = items; save(); renderLookup(); }
  function closeEditor() { editing = false; editorHost.innerHTML = ''; }

  function paintList() {
    listBox.innerHTML = '';
    if (!items.length) {
      const e = document.createElement('div');
      e.className = 'empty';
      e.textContent = '还没有速查条目,点下方「添加条目」';
      listBox.appendChild(e);
      return;
    }
    items.forEach(function (item, idx) {
      const node = mk('tpl-manage-item');
      const btn = $('.mi-name', node);
      btn.textContent = item.name + '(' + item.kindText + ')';
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', function () {
        if (editing) {
          Sheet.confirmSheet({
            title: '放弃未保存的修改?', message: '当前编辑内容尚未保存,切换后会丢失。',
            okText: '放弃并切换', danger: true,
            onOk: function () { closeEditor(); editItem(idx); }
          });
          return;
        }
        editItem(idx);
      });
      const up = $('.mi-up', node), down = $('.mi-down', node);
      up.disabled = idx === 0; down.disabled = idx === items.length - 1;
      up.addEventListener('click', function () {
        const p = items[idx - 1]; items[idx - 1] = items[idx]; items[idx] = p;
        closeEditor(); paintList(); commit();
      });
      down.addEventListener('click', function () {
        const n = items[idx + 1]; items[idx + 1] = items[idx]; items[idx] = n;
        closeEditor(); paintList(); commit();
      });
      $('.mi-del', node).addEventListener('click', function () {
        Sheet.confirmSheet({
          title: '删除「' + item.name + '」?', message: '删除后无法恢复。', okText: '删除', danger: true,
          onOk: function () {
            items.splice(idx, 1);
            closeEditor(); paintList(); commit();
            toast('已删除');
          }
        });
      });
      listBox.appendChild(node);
    });
  }

  function editItem(idx) {
    editorHost.innerHTML = '';
    const item = items[idx];

    function field(labelText, el) {
      const lab = document.createElement('div');
      lab.className = 'field-label';
      lab.textContent = labelText;
      editorHost.appendChild(lab);
      editorHost.appendChild(el);
    }

    const nameInput = document.createElement('input');
    nameInput.className = 'input'; nameInput.type = 'text';
    nameInput.value = item.name; nameInput.placeholder = '如:管制刀具';
    nameInput.style.marginBottom = '9px';

    const kindSelect = document.createElement('select');
    kindSelect.className = 'select'; kindSelect.style.marginBottom = '9px';
    KIND_META.forEach(function (m) {
      const o = document.createElement('option');
      o.value = m.kind; o.textContent = m.label;
      if (item.kind === m.kind) o.selected = true;
      kindSelect.appendChild(o);
    });

    const itemsInput = document.createElement('textarea');
    itemsInput.className = 'textarea'; itemsInput.rows = 6;
    itemsInput.value = item.items.join('\n');
    itemsInput.placeholder = '每行一条内容';
    itemsInput.style.marginBottom = '9px';

    const warnInput = document.createElement('input');
    warnInput.className = 'input'; warnInput.type = 'text';
    warnInput.value = item.warn || '';
    warnInput.placeholder = '如:注意区分管制刀具与非管制刀具';
    warnInput.style.marginBottom = '14px';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button'; saveBtn.className = 'btn btn-primary btn-block';
    saveBtn.textContent = '保存条目';
    saveBtn.addEventListener('click', function () {
      item.name = nameInput.value.trim() || '未命名';
      item.kind = kindSelect.value;
      item.kindText = KIND_BADGE[item.kind] || item.kind;
      item.items = itemsInput.value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      item.warn = warnInput.value.trim();
      closeEditor(); paintList(); commit();
      toast('条目已保存');
    });

    [nameInput, itemsInput, warnInput].forEach(function (el) {
      el.addEventListener('input', function () { editing = true; });
    });
    kindSelect.addEventListener('change', function () { editing = true; });

    field('条目名称', nameInput);
    field('分类', kindSelect);
    field('内容项(每行一条)', itemsInput);
    field('警告提示(选填)', warnInput);
    editorHost.appendChild(saveBtn);
  }

  function doAdd() {
    items.push({ kind: 'ban', kindText: '禁止携带', name: '新条目', items: [], warn: '' });
    paintList(); commit();
    editItem(items.length - 1);
    const f = editorHost.querySelector('input');
    if (f) { try { f.focus(); } catch (e) {} }
  }

  const footNode = document.createElement('div');
  footNode.className = 'btn-row';
  const addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'btn btn-primary';
  addBtn.textContent = '添加条目';
  addBtn.addEventListener('click', function () {
    if (editing) {
      Sheet.confirmSheet({
        title: '放弃未保存的修改?', message: '当前编辑内容尚未保存,新增后会丢失。',
        okText: '放弃并新增', danger: true, onOk: doAdd
      });
      return;
    }
    doAdd();
  });
  footNode.appendChild(addBtn);

  paintList();
  Sheet.open({
    title: '管理速查内容', bodyNode: bodyNode, footNode: footNode,
    dirty: function () { return editing; },
    onClose: function () { editing = false; }
  });
}

export function bindLookup() {
  $('#btnManageLookup').addEventListener('click', openLookupSheet);
  const lkSearch = $('#lookupSearch');
  lkSearch.addEventListener('input', debounce(function () { lookupQuery = lkSearch.value; renderLookup(); }, 200));
}
