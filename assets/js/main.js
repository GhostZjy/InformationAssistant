/* 安检工作台 · 入口:导航 / 启动 / 事件总线 */
import { bus, $, $$, toast } from './core.js';
import { Sound } from './ui.js';
import { data, autoSnapshot, updateBackupLast } from './store.js';
import * as report from './report.js';
import * as timeline from './timeline.js';
import * as lookup from './lookup.js';
import * as history from './history.js';
import * as settings from './settings.js';
import * as team from './team.js';

let currentView = 'report';
let mineSub = 'history';

/* SECTION: render */
function renderMine() {
  if (mineSub === 'history') history.renderHistory();
  else settings.renderSettingsAll();
}
function renderActive() {
  Sound.enabled = data.settings.notify.sound;
  if (currentView === 'report') report.refreshReport();
  else if (currentView === 'timeline') { timeline.renderTimeline(true); timeline.renderRemindBar(); }
  else if (currentView === 'lookup') lookup.renderLookup();
  else if (currentView === 'team') team.renderTeam();
  else if (currentView === 'mine') renderMine();
}
function renderAll() {
  Sound.enabled = data.settings.notify.sound;
  settings.renderHeaderSub();
  report.refreshReport();
  timeline.renderTimeline(true);
  timeline.renderRemindBar();
  lookup.renderLookup();
  history.renderHistory();
  settings.renderSettingsAll();
  team.renderTeam();
  updateBackupLast();
}

/* SECTION: nav */
function switchView(name) {
  currentView = name;
  $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
  $$('.tab').forEach(function (t) {
    const on = t.dataset.view === name;
    t.setAttribute('aria-selected', on ? 'true' : 'false');
    t.tabIndex = on ? 0 : -1;
  });
  if (name === 'report') {
    report.applyTimelineTpl();
    report.refreshReport();
    report.maybeRefreshDatetime();
  } else {
    renderActive();
  }
  try { window.scrollTo({ top: 0 }); } catch (e) { window.scrollTo(0, 0); }
}
function switchMineSub(name) {
  mineSub = name;
  $$('.mine-sub').forEach(function (p) { p.classList.toggle('active', p.id === 'mine-' + name); });
  $$('.mine-subtab').forEach(function (t) { t.setAttribute('aria-selected', t.dataset.sub === name ? 'true' : 'false'); });
  renderMine();
}
function bindTabs() {
  const tabs = $$('.tab');
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { switchView(t.dataset.view); });
    t.addEventListener('keydown', function (e) {
      let d = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') d = 1;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') d = -1;
      else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); switchView(tabs[0].dataset.view); return; }
      else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length - 1].focus(); switchView(tabs[tabs.length - 1].dataset.view); return; }
      else return;
      e.preventDefault();
      const n = tabs[(i + d + tabs.length) % tabs.length];
      n.focus(); switchView(n.dataset.view);
    });
  });
  $$('.mine-subtab').forEach(function (t) { t.addEventListener('click', function () { switchMineSub(t.dataset.sub); }); });
}

/* SECTION: pwa */
function injectPwa() {
  try {
    const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="42" fill="#4f7cf7"/><path d="M96 30l52 26v40c0 33-22 56-52 66-30-10-52-33-52-66V56z" fill="none" stroke="#fff" stroke-width="9" stroke-linejoin="round"/><path d="M76 96l14 14 28-28" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const iconUrl = 'data:image/svg+xml,' + encodeURIComponent(icon);
    const manifest = {
      name: '安检工作台', short_name: '安检工作台', description: '安检班组一体化工作台',
      start_url: '.', scope: '.', display: 'standalone', orientation: 'portrait',
      background_color: '#f2f4f8', theme_color: '#4f7cf7',
      icons: [{ src: iconUrl, sizes: '192x192 512x512', type: 'image/svg+xml', purpose: 'any' }]
    };
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(manifest));
    document.head.appendChild(link);
    const ai = document.createElement('link'); ai.rel = 'apple-touch-icon'; ai.href = iconUrl; document.head.appendChild(ai);
    const fi = document.createElement('link'); fi.rel = 'icon'; fi.href = iconUrl; document.head.appendChild(fi);
  } catch (e) { /* PWA 增强失败不影响主功能 */ }
}

/* SECTION: boot */
function boot() {
  injectPwa();
  settings.applyTheme();
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = function () { if ((data.settings.theme || 'auto') === 'auto') settings.applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  } catch (e) {}
  settings.bindSettingsInputs();
  settings.bindSettings();
  settings.bindCollapse();
  report.bindReport();
  timeline.bindTimeline();
  lookup.bindLookup();
  history.bindHistory();
  team.bindTeam();
  bindTabs();
  autoSnapshot();
  renderAll();
  switchView('report');
  timeline.Reminder.start();
  document.addEventListener('pointerdown', function () { Sound.unlock(); }, { once: true });
  let errToastAt = 0;
  window.addEventListener('error', function (e) {
    const now = Date.now();
    if (now - errToastAt < 5000) return;
    errToastAt = now;
    if (e && e.message) toast('出现异常:' + e.message);
  });
  bus.on('refresh', renderAll);
  bus.on('navigate', switchView);
  let seen = null;
  try { seen = localStorage.getItem('securityWorkbench.seen'); } catch (e) {}
  if (!seen) {
    try { localStorage.setItem('securityWorkbench.seen', '1'); } catch (e) {}
    setTimeout(settings.openHelpSheet, 500);
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
