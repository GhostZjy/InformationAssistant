import { $, mk } from './core.js';

export const Sound = (function () {
  let ctx = null;
  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function beep(times) {
    if (!Sound.enabled) return;
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') { c.resume().catch(function () {}); }
    const n = times || 2;
    for (let i = 0; i < n; i++) {
      const t0 = c.currentTime + i * 0.32;
      const osc = c.createOscillator(), gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t0);
      osc.frequency.setValueAtTime(1174, t0 + 0.12);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.28, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
      osc.connect(gain); gain.connect(c.destination);
      osc.start(t0); osc.stop(t0 + 0.3);
    }
  }
  function unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume().catch(function () {}); }
  return { beep, unlock, enabled: true };
})();


/* 速查内容属于数据,不内置在工具里:通过「设置 → 导入配置」载入,或在设置页自行维护 */

export const Sheet = (function () {
  const layer = $('#sheetLayer'), backdrop = $('#sheetBackdrop'), body = $('#sheetBody'),
    foot = $('#sheetFoot'), titleEl = $('#sheetTitle'), closeBtn = $('#sheetClose');
  const stack = [];
  let current = null, lastFocus = null;
  function detach(node) { const arr = []; while (node.firstChild) arr.push(node.removeChild(node.firstChild)); return arr; }
  function attach(node, arr) { arr.forEach(function (c) { node.appendChild(c); }); }
  function open(cfg) {
    if (current) {
      stack.push({ cfg: current, title: titleEl.textContent, bodyKids: detach(body), footKids: detach(foot) });
    } else {
      lastFocus = document.activeElement;
    }
    titleEl.textContent = cfg.title || '';
    detach(body); detach(foot);
    if (cfg.bodyNode) body.appendChild(cfg.bodyNode);
    if (cfg.footNode) foot.appendChild(cfg.footNode);
    current = cfg;
    layer.classList.add('open');
    document.body.classList.add('sheet-open');
    Sound.unlock();
    body.scrollTop = 0;
    if (cfg.onOpen) cfg.onOpen(body, foot);
    if (cfg.autofocus !== false) {
      setTimeout(function () {
        const f = body.querySelector('input:not([type=hidden]),select,textarea,button');
        if (f && f.focus) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
      }, 80);
    }
  }
  function closeNow() {
    if (!current) return;
    const cfg = current;
    detach(body); detach(foot);
    const prev = stack.pop();
    if (prev) {
      current = prev.cfg;
      titleEl.textContent = prev.title;
      attach(body, prev.bodyKids); attach(foot, prev.footKids);
    } else {
      current = null;
      layer.classList.remove('open');
      document.body.classList.remove('sheet-open');
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
    }
    if (cfg.onClose) cfg.onClose();
  }
  function requestClose() {
    if (current && typeof current.dirty === 'function' && current.dirty()) {
      confirmSheet({
        title: '放弃未保存的修改?', message: '当前编辑内容尚未保存,关闭后会丢失。',
        okText: '放弃修改', danger: true, closeParent: true
      });
      return;
    }
    closeNow();
  }
  function confirmSheet(cfg) {
    const node = mk('tpl-confirm-body');
    $('.cf-msg', node).textContent = cfg.message || '';
    if (cfg.detail) {
      const box = $('.cf-detail', node);
      box.hidden = false;
      $('.preview', box).textContent = cfg.detail;
    }
    const f = document.createElement('div');
    f.className = 'btn-row';
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'btn'; cancel.textContent = cfg.cancelText || '取消';
    const ok = document.createElement('button');
    ok.type = 'button'; ok.className = 'btn ' + (cfg.danger ? 'btn-danger' : 'btn-primary');
    ok.textContent = cfg.okText || '确定';
    ok.addEventListener('click', function () {
      closeNow();
      if (cfg.closeParent && stack.length) closeNow();
      if (cfg.onOk) cfg.onOk();
    });
    cancel.addEventListener('click', function () { closeNow(); if (cfg.onCancel) cfg.onCancel(); });
    f.appendChild(cancel); f.appendChild(ok);
    open({ title: cfg.title || '请确认', bodyNode: node, footNode: f, autofocus: false });
  }
  closeBtn.addEventListener('click', requestClose);
  backdrop.addEventListener('click', requestClose);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && current) { e.preventDefault(); requestClose(); }
  });
  return { open, closeNow, requestClose, confirmSheet, isOpen: function () { return !!current; } };
})();


