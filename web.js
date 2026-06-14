const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getSetting, setSetting, initSettings } = require('./Settings');
const { getTargetMeta } = require('web/state.js');
const {
  createWebSession,
  getWebSessionByToken,
  validateWebSession,
  destroyWebSession,
  attachWebSessionPair,
  detachWebSessionPair,
  loadSessionIds,
  getSessionDoc,
  getSessionFolder,
  deleteSessionArtifacts,
  upsertReminder,
  getAccountByAccountId,
} = require('./database/mongo');

const PORT = Number(process.env.PORT || 3000);
const PAIR_DIR = path.join(__dirname, 'richstore', 'pairing');
const SETTINGS_PATH = path.join(__dirname, 'setting.json');
const COOKIE_NAME = 'void_dashboard';
const OWNER_COOKIE_NAME = 'void_owner_dashboard';
const OWNER_WEB_PASSWORD = process.env.OWNER_WEB_PASSWORD || process.env.OWNER_PASSWORD || '';
let pairCache = [];
const sessions = new Set();
const ownerSessions = new Set();
const NAV = [
  { href: '/', label: 'Home' },
  { href: '/accounts', label: 'My Accounts' },
  { href: '/commands', label: 'Feature Settings', accountRequired: true },
  { href: '/groups', label: 'Group Tools', accountRequired: true },
  { href: '/business', label: 'Automations', accountRequired: true },
  { href: '/chats', label: 'Chat List', accountRequired: true },
  { href: '/reminders', label: 'Reminders', accountRequired: true },
  { href: '/pairing', label: 'Link New Device' }
];

const CONTROL_CATALOG = [
  { page: 'commands', section: 'System', key: 'mode', label: 'Public Access', kind: 'mode', scope: 'bot', description: 'Allow everyone to use the bot or keep it private.' },
  { page: 'commands', section: 'Groups', key: 'welcome', label: 'Welcome Messages', kind: 'toggle', scope: 'chat', description: 'Send a greeting when someone joins the group.' },
  { page: 'commands', section: 'Groups', key: 'autoReact', label: 'Emoji Reactions', kind: 'toggle', scope: 'chat', description: 'Automatically add emojis to new messages.' },
  { page: 'commands', section: 'Groups', key: 'autoTyping', label: 'Typing Indicator', kind: 'toggle', scope: 'chat', description: 'Show "typing..." status when active.' },
  { page: 'commands', section: 'Groups', key: 'autoRecording', label: 'Recording Indicator', kind: 'toggle', scope: 'chat', description: 'Show "recording audio..." status.' },
  { page: 'commands', section: 'Groups', key: 'antilink', label: 'Group Link Blocker', kind: 'toggle', scope: 'chat', description: 'Automatically delete other group invite links.' },
  { page: 'commands', section: 'Business', key: 'feature.autoreply', label: 'Auto Responses', kind: 'toggle', scope: 'chat', description: 'Automatically reply to specific messages.' },
  { page: 'commands', section: 'Business', key: 'feature.antispam', label: 'Spam Protection', kind: 'toggle', scope: 'chat', description: 'Block or remove users who send too many messages.' },
  { page: 'commands', section: 'Business', key: 'feature.antibadword', label: 'Word Filter', kind: 'toggle', scope: 'chat', description: 'Delete messages containing inappropriate language.' },
  { page: 'commands', section: 'Business', key: 'feature.antibot', label: 'Bot Blocker', kind: 'toggle', scope: 'chat', description: 'Prevent other bots from interacting with this chat.' },
  { page: 'commands', section: 'Business', key: 'autobio', label: 'Smart Bio', kind: 'toggle', scope: 'user', description: 'Automatically update your profile description.' },
  { page: 'commands', section: 'Business', key: 'autoread', label: 'Auto-Read Messages', kind: 'toggle', scope: 'user', description: 'Instantly mark incoming messages as seen.' },
  { page: 'commands', section: 'Business', key: 'autoViewStatus', label: 'Status Viewer', kind: 'toggle', scope: 'user', description: 'Automatically view your contacts\' status updates.' },
  { page: 'groups', section: 'Group Controls', key: 'welcome', label: 'Welcome Messages', kind: 'toggle', scope: 'chat', description: 'Send a greeting when someone joins the group.' },
  { page: 'groups', section: 'Group Controls', key: 'autoReact', label: 'Emoji Reactions', kind: 'toggle', scope: 'chat', description: 'Automatically add emojis to new messages.' },
  { page: 'groups', section: 'Group Controls', key: 'autoTyping', label: 'Typing Indicator', kind: 'toggle', scope: 'chat', description: 'Show "typing..." status when active.' },
  { page: 'groups', section: 'Group Controls', key: 'autoRecording', label: 'Recording Indicator', kind: 'toggle', scope: 'chat', description: 'Show "recording audio..." status.' },
  { page: 'groups', section: 'Group Controls', key: 'antilink', label: 'Group Link Blocker', kind: 'toggle', scope: 'chat', description: 'Automatically delete other group invite links.' },
  { page: 'business', section: 'Chat Automation', key: 'feature.autoreply', label: 'Auto Responses', kind: 'toggle', scope: 'chat', description: 'Automatically reply to specific messages.' },
  { page: 'business', section: 'Chat Automation', key: 'feature.antispam', label: 'Spam Protection', kind: 'toggle', scope: 'chat', description: 'Block or remove users who send too many messages.' },
  { page: 'business', section: 'Chat Automation', key: 'feature.antibadword', label: 'Word Filter', kind: 'toggle', scope: 'chat', description: 'Delete messages containing inappropriate language.' },
  { page: 'business', section: 'Chat Automation', key: 'feature.antibot', label: 'Bot Blocker', kind: 'toggle', scope: 'chat', description: 'Prevent other bots from interacting with this chat.' },
  { page: 'business', section: 'Personal Automation', key: 'autobio', label: 'Smart Bio', kind: 'toggle', scope: 'user', description: 'Automatically update your profile description.' },
  { page: 'business', section: 'Personal Automation', key: 'autoread', label: 'Auto-Read Messages', kind: 'toggle', scope: 'user', description: 'Instantly mark incoming messages as seen.' },
  { page: 'business', section: 'Personal Automation', key: 'autoViewStatus', label: 'Status Viewer', kind: 'toggle', scope: 'user', description: 'Automatically view your contacts\' status updates.' }
];

const COMMAND_GUIDES = {
  groups: [
    { name: 'welcome', usage: 'welcome on/off', note: 'Toggle welcome and leave notices for a group.' },
    { name: 'antilink', usage: 'antilink on/off', note: 'Block WhatsApp invite links.' },
    { name: 'gc-reminder', usage: 'gc-reminder 60 Reminder text', note: 'Schedule a group reminder and ping the whole room.' },
    { name: 'mute', usage: 'mute', note: 'Put the group into announcement mode.' },
    { name: 'unmute', usage: 'unmute', note: 'Return the group to normal chat mode.' },
    { name: 'promote', usage: 'promote @user', note: 'Promote a member to admin.' },
    { name: 'demote', usage: 'demote @user', note: 'Demote an admin.' },
    { name: 'grouplink', usage: 'grouplink', note: 'Print the invite link for the current group.' },
    { name: 'creategroup', usage: 'creategroup My Group', note: 'Create a new group.' },
    { name: 'kick', usage: 'kick @user', note: 'Remove a member from the group.' },
    { name: 'add', usage: 'add 234xxxxxxxx', note: 'Add a user to the group.' }
  ],
  business: [
    { name: 'autoreply', usage: 'autoreply on/off', note: 'Enable or disable auto replies in a chat.' },
    { name: 'antispam', usage: 'antispam on/off', note: 'Remove spammy behavior from a chat.' },
    { name: 'antibadword', usage: 'antibadword on/off', note: 'Delete messages that contain bad words.' },
    { name: 'antibot', usage: 'antibot on/off', note: 'Block bot-like accounts in a chat.' },
    { name: 'autobio', usage: 'autobio on/off', note: 'Keep the profile bio updated.' },
    { name: 'autoread', usage: 'autoread on/off', note: 'Mark messages as read automatically.' },
    { name: 'autoViewStatus', usage: 'autoViewStatus on/off', note: 'View statuses automatically.' }
  ],
  chats: [
    { name: 'runtime', usage: 'runtime', note: 'Show bot uptime.' },
    { name: 'ping', usage: 'ping', note: 'Check bot response speed.' },
    { name: 'afk', usage: 'afk reason', note: 'Mark yourself away from keyboard.' }
  ]
};

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8') || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function readSettingsSnapshot() {
  return readJsonSafe(SETTINGS_PATH, {});
}

function listPairs(scopeSessionId = '', isOwner = false) {
  if (!scopeSessionId && !isOwner) return [];
  return pairCache.filter((sessionId) => {
    return isOwner ? true : sessionId === scopeSessionId;
  }).map((sessionId) => ({
    name: sessionId,
    path: getSessionFolder(sessionId),
  }));
}

async function refreshPairCache() {
  pairCache = await loadSessionIds({ status: 'active' }).catch(() => []);
  return pairCache;
}

initSettings()
  .then(() => refreshPairCache())
  .catch((error) => {
    console.error('MongoDB initialization failed for dashboard:', error.message);
  });

function getInfoDetails(settings = {}) {
  const meta = settings.__meta || {};
  return {
    name: meta.name || '',
    kind: meta.kind || '',
  };
}

function listTargets(scopeSessionId = '', isOwner = false) {
  if (!scopeSessionId && !isOwner) return [];
  const snapshot = readSettingsSnapshot();
  return Object.entries(snapshot)
    .filter(([jid]) => jid !== 'bot')
    .map(([jid, settings]) => {
      const meta = getInfoDetails(settings);
      const kind = meta.kind || (jid.endsWith('@g.us') ? 'group' : 'chat');
      const keys = Object.keys(settings || {}).filter((key) => key !== '__meta');
      const active = keys.filter((key) => Boolean(settings[key])).length;
      const ownerSessionId = settings.__ownerSessionId || '';
      if (!isOwner && ownerSessionId !== scopeSessionId) {
        return null;
      }
      return {
        jid,
        kind,
        name: meta.name || jid,
        keyCount: keys.length,
        activeCount: active,
        ownerSessionId,
        settings,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.name || a.jid).localeCompare(b.name || b.jid));
}

function getTargetKind(target) {
  if (target === 'bot') return 'bot';
  if (String(target).endsWith('@g.us')) return 'group';
  return 'chat';
}

function controlValue(target, key) {
  if (key === 'mode') return getSetting('bot', 'mode', 'public');
  return getSetting(target, key, false);
}

function buildState(target, scopeSessionId = '', isOwner = false) {
  const state = {};
  CONTROL_CATALOG.filter((item) => item.page === 'commands').forEach((item) => {
    state[item.key] = controlValue(target, item.key);
  });

  const controls = CONTROL_CATALOG.filter((item) => item.page !== 'commands');
  controls.forEach((item) => {
    state[item.key] = controlValue(target, item.key);
  });

  const pairs = listPairs(scopeSessionId, isOwner);
  const targets = listTargets(scopeSessionId, isOwner);
  const activeCount = Object.values(state).filter((value) => Boolean(value)).length;

  return {
    target,
    targetKind: getTargetKind(target),
    settings: state,
    summary: {
      totalKeys: Object.keys(state).length,
      activeCount,
      mode: controlValue('bot', 'mode')
    },
    pairs,
    targets,
    groups: targets.filter((entry) => entry.kind === 'group'),
    chats: targets.filter((entry) => entry.kind === 'chat')
  };
}

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index === -1) return acc;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) acc[name] = decodeURIComponent(value);
    return acc;
  }, {});
}

async function isAuthed(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return false;
  if (sessions.has(token)) return true;
  const ok = await validateWebSession(token).catch(() => false);
  if (ok) sessions.add(token);
  return ok;
}

async function isOwnerAuthed(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[OWNER_COOKIE_NAME];
  if (!token || !token.startsWith('owner-')) return false;
  if (ownerSessions.has(token)) return true;
  const ok = await validateWebSession(token).catch(() => false);
  if (ok) ownerSessions.add(token);
  return ok;
}

async function isDashboardAuthed(req) {
  return (await isAuthed(req)) || (await isOwnerAuthed(req));
}

async function getDashboardProfileSessionId(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return '';
  const doc = await getWebSessionByToken(token).catch(() => null);
  if (doc?.pairedSessionId) return doc.pairedSessionId;
  if (doc?.accountId) {
    const account = await getAccountByAccountId(doc.accountId).catch(() => null);
    return account?.linkedSessionId || '';
  }
  return '';
}

async function getDashboardAccountId(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return '';
  const doc = await getWebSessionByToken(token).catch(() => null);
  return doc?.accountId || '';
}

async function getDashboardScopeSessionId(req) {
  if (await isOwnerAuthed(req)) return '';
  return getDashboardProfileSessionId(req);
}

function sendJson(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function navMarkup(active, hasSelectedAccount = false) {
  return NAV.map((item) => {
    if (item.accountRequired && !hasSelectedAccount) return '';
    const cls = item.href === active ? 'nav-link active' : 'nav-link';
    return `<a class="${cls}" href="${item.href}">${escapeHtml(item.label)}</a>`;
  }).join('');
}

function controlCard(item) {
  const scopeLabel = item.scope === 'bot' ? 'Bot' : item.scope === 'user' ? 'User' : 'Chat';
  if (item.kind === 'mode') {
    return `
      <div class="control-card" data-control-key="${escapeHtml(item.key)}" data-control-kind="mode" data-control-scope="${escapeHtml(item.scope)}">
        <div>
          <div class="control-title">${escapeHtml(item.label)}</div>
          <div class="control-meta">${escapeHtml(item.description)} Scope: ${scopeLabel}.</div>
        </div>
        <select class="control-select" aria-label="${escapeHtml(item.label)}">
          <option value="public">public</option>
          <option value="self">self</option>
        </select>
      </div>`;
  }

  return `
    <div class="control-card" data-control-key="${escapeHtml(item.key)}" data-control-kind="toggle" data-control-scope="${escapeHtml(item.scope)}">
      <div>
        <div class="control-title">${escapeHtml(item.label)}</div>
        <div class="control-meta">${escapeHtml(item.description)} Scope: ${scopeLabel}.</div>
      </div>
      <label class="switch">
        <input type="checkbox" class="control-toggle" />
        <span class="switch-label">Off</span>
      </label>
    </div>`;
}

function guideCard(item) {
  return `
    <div class="guide-card">
      <div class="guide-name">${escapeHtml(item.name)}</div>
      <div class="guide-usage">${escapeHtml(item.usage)}</div>
      <div class="guide-note">${escapeHtml(item.note)}</div>
    </div>`;
}

function targetCard(item, openHref) {
  return `
    <div class="target-card">
      <div>
        <div class="target-title">${escapeHtml(item.name || item.jid)}</div>
        <div class="target-meta">${escapeHtml(item.jid)}<br />${item.kind.toUpperCase()} | ${item.keyCount} settings | ${item.activeCount} active</div>
      </div>
      <div class="row-actions">
        <a class="ghost-btn" href="${openHref}?target=${encodeURIComponent(item.jid)}">Open</a>
      </div>
    </div>`;
}

function pageShell({ active, title, subtitle, body, boot = {}, script = '', hasAccount = false }) {
  const nav = navMarkup(active, hasAccount);
  const topbarActions = boot.owner
    ? `<a class="ghost-btn" href="/">Dashboard</a><button class="ghost-btn danger-btn" id="logoutBtn" type="button">Logout</button>`
    : `<button class="ghost-btn" id="navToggle">Menu</button><button class="ghost-btn danger-btn" id="logoutBtn" type="button">Logout</button>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} | VOID MD</title>
  <style>
    :root {
      --bg: #07111d;
      --bg2: #0e1b2f;
      --panel: rgba(12, 19, 32, 0.84);
      --panel-border: rgba(255,255,255,.08);
      --text: #eff5ff;
      --muted: #9fb0cf;
      --accent: #77e0c1;
      --accent-2: #ffd166;
      --danger: #ff7b7b;
      --shadow: 0 28px 90px rgba(0,0,0,.36);
      --radius: 22px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(119, 224, 193, .16), transparent 28%),
        radial-gradient(circle at top right, rgba(255, 209, 102, .12), transparent 30%),
        linear-gradient(160deg, var(--bg), var(--bg2) 58%, #07111d);
    }
    a { color: inherit; text-decoration: none; }
    .app { display: grid; grid-template-columns: auto 1fr; min-height: 100vh; }
    .sidebar { width: 280px; transition: 0.3s ease; overflow: hidden; }
    .sidebar.collapsed { width: 0; padding: 0; border: 0; }
    .sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      padding: 24px 18px;
      border-right: 1px solid rgba(255,255,255,.06);
      background: rgba(5, 9, 16, .26);
      backdrop-filter: blur(16px);
    }
    .brand {
      display: grid;
      gap: 6px;
      padding: 12px 12px 20px;
    }
    .eyebrow {
      font-size: 11px;
      letter-spacing: .28em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 800;
    }
    .brand-title {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 28px;
      line-height: 1;
    }
    .brand-subtitle {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
    }
    .nav {
      display: grid;
      gap: 8px;
      margin-top: 18px;
    }
    .nav-link {
      padding: 12px 14px;
      border-radius: 16px;
      color: var(--muted);
      border: 1px solid transparent;
      background: rgba(255,255,255,.02);
      transition: .15s ease;
    }
    .nav-link:hover {
      color: var(--text);
      border-color: rgba(255,255,255,.08);
      background: rgba(255,255,255,.05);
    }
    .nav-link.active {
      color: #05111b;
      background: linear-gradient(135deg, var(--accent), #8ad9ff);
      border-color: transparent;
      font-weight: 800;
    }
    .sidebar-foot { display: none; }
    .main {
      padding: 24px;
      width: min(1400px, 100%);
    }
    .topbar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 18px;
    }
    .page-title {
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(2rem, 4vw, 3.6rem);
      margin: 0;
      line-height: .98;
    }
    .page-subtitle {
      color: var(--muted);
      margin-top: 10px;
      max-width: 72ch;
      line-height: 1.7;
    }
    .topbar-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--panel-border);
      box-shadow: var(--shadow);
      border-radius: var(--radius);
      backdrop-filter: blur(18px);
    }
    .hero {
      padding: 24px;
      display: grid;
      gap: 18px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }
    .stat {
      padding: 18px;
    }
    .stat-label {
      color: var(--muted);
      font-size: 13px;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: 900;
      margin-top: 8px;
    }
    .stat-note {
      color: var(--muted);
      font-size: 12px;
      margin-top: 6px;
    }
    .page-grid {
      margin-top: 18px;
      display: grid;
      grid-template-columns: 1.2fr .8fr;
      gap: 18px;
    }
    .section {
      padding: 20px;
      display: grid;
      gap: 14px;
    }
    .section-title {
      font-size: 20px;
      font-family: Georgia, "Times New Roman", serif;
      margin: 0;
    }
    .section-desc {
      color: var(--muted);
      line-height: 1.7;
      margin: 0;
      font-size: 14px;
    }
    .toolbar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }
    .field, .ghost-btn, .primary-btn, select, input {
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.04);
      color: var(--text);
      font: inherit;
      padding: 13px 15px;
      outline: none;
    }
    .field:focus, select:focus, input:focus {
      border-color: rgba(119, 224, 193, .55);
      box-shadow: 0 0 0 4px rgba(119, 224, 193, .08);
    }
    .primary-btn {
      background: linear-gradient(135deg, var(--accent), #8ad9ff);
      color: #05111b;
      font-weight: 900;
      border: 0;
      cursor: pointer;
    }
    .ghost-btn {
      width: auto;
      color: var(--text);
      background: rgba(255,255,255,.06);
    }
    .tiny-btn {
      padding: 8px 10px;
      border-radius: 12px;
      font-size: 12px;
      line-height: 1;
    }
    .danger-btn {
      background: rgba(255, 123, 123, .14);
      color: #ffd7d7;
      border: 1px solid rgba(255, 123, 123, .18);
    }
    .inline-copy, .inline-copy-value {
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .control-group {
      display: grid;
      gap: 12px;
    }
    .control-card, .guide-card, .target-card, .pair-card {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: center;
      padding: 15px;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,.08);
      background: rgba(255,255,255,.04);
    }
    .control-title, .target-title, .guide-name {
      font-weight: 900;
      font-size: 15px;
    }
    .control-meta, .target-meta, .guide-usage, .guide-note {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
      margin-top: 4px;
      word-break: break-word;
    }
    .switch {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 14px;
    }
    .switch input {
      width: 18px;
      height: 18px;
      margin: 0;
      accent-color: var(--accent);
      padding: 0;
    }
    .section-columns {
      display: grid;
      gap: 14px;
    }
    .chips {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(119, 224, 193, .12);
      color: var(--accent);
      font-size: 12px;
      font-weight: 800;
    }
    .list {
      display: grid;
      gap: 10px;
    }
    .muted-box {
      padding: 16px;
      border-radius: 16px;
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.06);
      color: var(--muted);
      line-height: 1.7;
      font-size: 14px;
    }
    .toast {
      position: fixed;
      right: 18px;
      bottom: 18px;
      min-width: 220px;
      padding: 14px 16px;
      border-radius: 14px;
      background: rgba(7, 12, 21, .95);
      border: 1px solid rgba(255,255,255,.1);
      box-shadow: var(--shadow);
      transform: translateY(16px);
      opacity: 0;
      pointer-events: none;
      transition: .2s ease;
      z-index: 30;
    }
    .toast.show { opacity: 1; transform: translateY(0); }
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.8);
      backdrop-filter: blur(10px); display: none; place-items: center; z-index: 1000;
      opacity: 0; transition: .3s ease;
    }
    .modal-overlay.show { display: grid; opacity: 1; }
    .modal-box {
      width: min(600px, 90%); max-height: 90vh; overflow: auto;
      padding: 28px; background: var(--panel); border: 1px solid var(--panel-border);
      border-radius: var(--radius); box-shadow: var(--shadow);
    }
    .page-shell { display: grid; gap: 18px; }
    .pair-head {
      display: grid;
      gap: 10px;
    }
    .pair-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    .pair-action {
      display: grid;
      gap: 12px;
    }
    .pair-list {
      display: grid;
      gap: 10px;
      max-height: 500px;
      overflow: auto;
      padding-right: 4px;
    }
    .pairs-shell {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    .cards-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    .cards-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    @media (max-width: 1180px) {
      .app { grid-template-columns: 1fr; }
      .sidebar {
        position: relative;
        height: auto;
        border-right: 0;
        border-bottom: 1px solid rgba(255,255,255,.06);
      }
      .page-grid, .pairs-shell, .grid-4, .cards-3, .cards-2, .pair-stats { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <div class="eyebrow">VOID MD</div>
        <div class="brand-title">Control Deck</div>
        <div class="brand-subtitle">Organized pages for pairing, groups, business automations, chat views, and command management.</div>
      </div>
      <nav class="nav">${nav}</nav>
      <div class="sidebar-foot">
        Same pairing files. Same settings store. The dashboard just organizes what the bot already knows.
      </div>
      <div class="modal-overlay" id="modalOverlay">
        <div class="modal-box">
          <div id="modalContent"></div>
          <div class="toolbar" style="margin-top: 24px; justify-content: flex-end;">
            <button class="ghost-btn" onclick="Dashboard.closeModal()">Close</button>
          </div>
        </div>
      </div>
    </aside>
    <main class="main">
      <div class="topbar">
        <div>
          <h1 class="page-title">${escapeHtml(title)}</h1>
          <div class="page-subtitle">${escapeHtml(subtitle)}</div>
        </div>
        <div class="topbar-actions">${topbarActions}</div>
      </div>
      ${body}
    </main>
  </div>
  <div class="toast" id="toast"></div>
  <script>
    window.__BOOT = ${JSON.stringify(boot)};

    const Dashboard = (() => {
      const toast = document.getElementById('toast');

      function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(window.__toastTimer);
        window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
      }

      function openModal(contentHtml) {
        const overlay = document.getElementById('modalOverlay');
        const box = document.getElementById('modalContent');
        box.innerHTML = contentHtml;
        overlay.classList.add('show');
        bindControls();
      }

      function closeModal() {
        document.getElementById('modalOverlay').classList.remove('show');
      }

      async function request(url, options = {}) {
        const response = await fetch(url, {
          headers: { 'Content-Type': 'application/json' },
          ...options
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
      }

      function getTargetInput() {
        return document.querySelector('[data-target-input]');
      }

      function getTarget() {
        const input = getTargetInput();
        if (input && input.value.trim()) return input.value.trim();
        return (window.__BOOT && window.__BOOT.defaultTarget) || 'bot';
      }

      function setSummary(data) {
        const map = {
          summaryKeys: data.summary.totalKeys,
          summaryActive: data.summary.activeCount,
          summaryMode: data.summary.mode,
          summaryPairs: data.pairs.length,
          summaryGroups: data.groups.length,
          summaryChats: data.chats.length
        };
        Object.keys(map).forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.textContent = String(map[id]);
        });
      }

      function applyControlState(data) {
        document.querySelectorAll('[data-control-key]').forEach((card) => {
          const key = card.getAttribute('data-control-key');
          const kind = card.getAttribute('data-control-kind');
          const value = data.settings[key];
          if (kind === 'mode') {
            const select = card.querySelector('select');
            if (select) select.value = value === 'self' ? 'self' : 'public';
          } else {
            const input = card.querySelector('input[type="checkbox"]');
            const label = card.querySelector('.switch-label');
            if (input) input.checked = Boolean(value);
            if (label) label.textContent = Boolean(value) ? 'On' : 'Off';
          }
        });
      }

      function bindControls() {
        document.querySelectorAll('[data-control-key]').forEach((card) => {
          const key = card.getAttribute('data-control-key');
          const kind = card.getAttribute('data-control-kind');
          const scope = card.getAttribute('data-control-scope') || 'chat';
          const targetResolver = () => (kind === 'mode' ? 'bot' : getTarget());
          if (kind === 'mode') {
            const select = card.querySelector('select');
            if (!select || select.dataset.bound === '1') return;
            select.dataset.bound = '1';
            select.addEventListener('change', async () => {
              await request('/api/setting', {
                method: 'POST',
                body: JSON.stringify({
                  target: 'bot',
                  key,
                  value: select.value
                })
              });
              showToast('Saved ' + key);
              await loadState();
            });
          } else {
            const input = card.querySelector('input[type="checkbox"]');
            if (!input || input.dataset.bound === '1') return;
            input.dataset.bound = '1';
            input.addEventListener('change', async () => {
              await request('/api/setting', {
                method: 'POST',
                body: JSON.stringify({
                  target: targetResolver(),
                  key,
                  value: input.checked
                })
              });
              showToast('Saved ' + key + ' for ' + scope + ' target');
              const label = card.querySelector('.switch-label');
              if (label) label.textContent = input.checked ? 'On' : 'Off';
              await loadState();
            });
          }
        });
      }

      async function loadState() {
        const target = getTarget();
        const data = await request('/api/state?target=' + encodeURIComponent(target));
        setSummary(data);
        applyControlState(data);
        bindControls();
        return data;
      }

      async function logout() {
        const endpoint = window.__BOOT && window.__BOOT.owner ? '/api/owner/logout' : '/api/logout';
        await request(endpoint, { method: 'POST' });
        window.location.reload();
      }

      function bindLogout() {
        const btn = document.getElementById('logoutBtn');
        if (btn) btn.addEventListener('click', logout);
      }

      function bindTargetReload() {
        const btn = document.querySelector('[data-target-reload]');
        if (btn) btn.addEventListener('click', loadState);
        const input = getTargetInput();
        if (input) {
          input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') loadState();
          });
        }
      }

      async function postPair(number) {
        return request('/api/pair', {
          method: 'POST',
          body: JSON.stringify({ number })
        });
      }

      async function getPairStatus(target) {
        return request('/api/pair/status?target=' + encodeURIComponent(target));
      }

      async function createReminder(payload) {
        return request('/api/reminder', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      async function loadReminderPrefs() {
        return request('/api/reminders/prefs');
      }

      async function saveReminderPrefs(prefs) {
        return request('/api/reminders/prefs', {
          method: 'POST',
          body: JSON.stringify({ prefs })
        });
      }

      async function listReminders(view = 'upcoming') {
        return request('/api/reminders?view=' + encodeURIComponent(view));
      }

      async function parseReminderText(text) {
        return request('/api/reminders/parse', {
          method: 'POST',
          body: JSON.stringify({ text })
        });
      }

      async function updateReminder(reminderId, payload) {
        return request('/api/reminders/' + encodeURIComponent(reminderId), {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      }

      async function reminderAction(reminderId, action, payload = {}) {
        return request('/api/reminders/' + encodeURIComponent(reminderId) + '/action', {
          method: 'POST',
          body: JSON.stringify({ action, ...payload })
        });
      }

      async function deleteReminder(reminderId) {
        return request('/api/reminders/' + encodeURIComponent(reminderId), {
          method: 'DELETE'
        });
      }

      async function removePair(target) {
        return request('/api/pairing/remove', {
          method: 'POST',
          body: JSON.stringify({ target })
        });
      }

      async function selectAccountSession(sessionId) {
        return request('/api/account/select', {
          method: 'POST',
          body: JSON.stringify({ sessionId })
        });
      }

      async function listAccountSessions() {
        return request('/api/account/sessions');
      }

      function renderTargets(list, containerId, openHref) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!list.length) {
          container.innerHTML = '<div class="muted-box">No targets found in the settings store yet.</div>';
          return;
        }
        container.innerHTML = list.map((item) => {
          return '<div class="target-card">' +
            '<div>' +
              '<div class="target-title">' + (item.name || item.jid) + '</div>' +
              '<div class="target-meta">' + item.jid + '<br />' + item.kind.toUpperCase() + ' | ' + item.keyCount + ' settings | ' + item.activeCount + ' active</div>' +
            '</div>' +
            '<div class="row-actions">' +
              '<a class="ghost-btn" href="' + openHref + '?target=' + encodeURIComponent(item.jid) + '">Open</a>' +
            '</div>' +
          '</div>';
        }).join('');
      }

      function renderPairs(list) {
        const container = document.getElementById('pairList');
        if (!container) return;
        if (!list.length) {
          container.innerHTML = '<div class="muted-box">No paired sessions have been created yet.</div>';
          return;
        }
        container.innerHTML = list.map((item) => {
          return '<div class="pair-card">' +
            '<div>' +
              '<div class="target-title">' + item.name + '</div>' +
              '<div class="target-meta">' + item.path + '</div>' +
            '</div>' +
            '<button class="ghost-btn danger-btn" type="button" data-remove-pair="' + item.name + '">Remove</button>' +
          '</div>';
        }).join('');
        container.querySelectorAll('[data-remove-pair]').forEach((button) => {
          if (button.dataset.bound === '1') return;
          button.dataset.bound = '1';
          button.addEventListener('click', async () => {
            const target = button.getAttribute('data-remove-pair');
            if (!window.confirm('Remove this paired session?')) return;
            await removePair(target);
            showToast('Pair removed');
            await loadState();
            if (typeof window.refreshPairsPage === 'function') window.refreshPairsPage();
          });
        });
      }

      bindLogout();
      bindTargetReload();

      function openSettingsSection(section) {
        const items = window.__BOOT.controlCatalog.filter(i => i.page === 'commands' && i.section === section);
        const html = '<h2 class="section-title">' + section + ' Settings</h2>' +
                     '<p class="section-desc">Manage your ' + section.toLowerCase() + ' configurations below.</p>' +
                     '<div class="control-group" style="margin-top:20px">' +
                     items.map(i => {
                        // Simplified version of controlCard for client side
                        const value = window.__LATEST_STATE.settings[i.key];
                        const checked = value ? 'checked' : '';
                        const label = value ? 'On' : 'Off';
                        return '<div class="control-card" data-control-key="' + i.key + '" data-control-kind="' + i.kind + '">' +
                               '<div><div class="control-title">' + i.label + '</div><div class="control-meta">' + i.description + '</div></div>' +
                               (i.kind === 'mode' ? '<select class="control-select"><option value="public" '+(value==='public'?'selected':'')+'>public</option><option value="self" '+(value==='self'?'selected':'')+'>self</option></select>' : '<label class="switch"><input type="checkbox" class="control-toggle" '+checked+' /> <span class="switch-label">'+label+'</span></label>') +
                               '</div>';
                     }).join('') + '</div>';
        openModal(html);
      }

      return {
        showToast,
        request,
        loadState,
        postPair,
        removePair,
        selectAccountSession,
        listAccountSessions,
        renderTargets,
        renderPairs,
        getPairStatus,
        createReminder,
        loadReminderPrefs,
        saveReminderPrefs,
        listReminders,
        parseReminderText,
        updateReminder,
        reminderAction,
        deleteReminder,
        bindControls,
        applyControlState,
        openModal,
        closeModal,
        openSettingsSection
      };
    })();

    window.Dashboard = Dashboard;
    ${script}
  </script>
</body>
</html>`;
}

function loginPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VOID MD Dashboard</title>
  <style>
    :root {
      --bg: #07111d;
      --bg2: #0e1b2f;
      --panel: rgba(12, 19, 32, 0.86);
      --panel-border: rgba(255,255,255,.08);
      --text: #eff5ff;
      --muted: #9fb0cf;
      --accent: #77e0c1;
      --shadow: 0 28px 90px rgba(0,0,0,.36);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      color: var(--text);
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(119, 224, 193, .16), transparent 28%),
        radial-gradient(circle at top right, rgba(255, 209, 102, .12), transparent 30%),
        linear-gradient(160deg, var(--bg), var(--bg2) 58%, #07111d);
      padding: 24px;
    }
    .panel {
      width: min(460px, 100%);
      padding: 28px;
      background: var(--panel);
      border: 1px solid var(--panel-border);
      box-shadow: var(--shadow);
      border-radius: 24px;
      backdrop-filter: blur(18px);
    }
    .eyebrow {
      font-size: 11px;
      letter-spacing: .28em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 800;
      margin-bottom: 14px;
    }
    h1 {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 44px;
      line-height: .95;
      margin: 0 0 12px 0;
    }
    p {
      margin: 0;
      color: var(--muted);
      line-height: 1.7;
    }
    label {
      display: block;
      margin: 18px 0 8px;
      color: var(--muted);
      font-size: 13px;
    }
    input, button {
      width: 100%;
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.04);
      color: var(--text);
      font: inherit;
    }
    input:focus {
      outline: none;
      border-color: rgba(119, 224, 193, .55);
      box-shadow: 0 0 0 4px rgba(119, 224, 193, .08);
    }
    button {
      margin-top: 14px;
      border: 0;
      background: linear-gradient(135deg, var(--accent), #8ad9ff);
      color: #05111b;
      font-weight: 900;
      cursor: pointer;
    }
    .small {
      margin-top: 12px;
      color: var(--muted);
      font-size: 13px;
      min-height: 20px;
    }
  </style>
</head>
<body>
  <div style="display:grid; gap:16px; width:min(980px,100%); grid-template-columns:repeat(auto-fit,minmax(280px,1fr));">
    <div class="panel">
      <div class="eyebrow">VOID MD</div>
      <h1>Create account</h1>
      <p>Create your web account with Gmail, password, and access code.</p>
      <label for="signupEmail">Gmail</label>
      <input id="signupEmail" type="email" autocomplete="email" placeholder="name@gmail.com" />
      <label for="signupPassword">Password</label>
      <input id="signupPassword" type="password" autocomplete="new-password" placeholder="Create a password" />
      <label for="signupAccessCode">Access code</label>
      <input id="signupAccessCode" type="password" autocomplete="one-time-code" placeholder="Create an access code" />
      <button id="signupBtn" type="button">Create account</button>
      <div class="small" id="signupMsg"></div>
    </div>
    <div class="panel">
      <div class="eyebrow">VOID MD</div>
      <h1>Sign in</h1>
      <p>Use the Gmail, password, and access code from your account.</p>
      <label for="loginEmail">Gmail</label>
      <input id="loginEmail" type="email" autocomplete="email" placeholder="name@gmail.com" />
      <label for="loginPassword">Password</label>
      <input id="loginPassword" type="password" autocomplete="current-password" placeholder="Enter your password" />
      <label for="loginAccessCode">Access code</label>
      <input id="loginAccessCode" type="password" autocomplete="one-time-code" placeholder="Enter your access code" />
      <button id="loginBtn" type="button">Unlock dashboard</button>
      <div class="small" id="loginMsg"></div>
    </div>
  </div>
  <script>
    const loginBtn = document.getElementById('loginBtn');
    const loginMsg = document.getElementById('loginMsg');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginAccessCode = document.getElementById('loginAccessCode');
    const signupBtn = document.getElementById('signupBtn');
    const signupMsg = document.getElementById('signupMsg');
    const signupEmail = document.getElementById('signupEmail');
    const signupPassword = document.getElementById('signupPassword');
    const signupAccessCode = document.getElementById('signupAccessCode');

    async function submit(endpoint, payload, button, message) {
      button.disabled = true;
      message.textContent = 'Checking access...';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Login failed');
        window.location.reload();
      } catch (err) {
        message.textContent = err.message;
        button.disabled = false;
      }
    }

    loginBtn.addEventListener('click', () => submit('/api/login', {
      email: loginEmail.value,
      password: loginPassword.value,
      accessCode: loginAccessCode.value
    }, loginBtn, loginMsg));
    signupBtn.addEventListener('click', () => submit('/api/signup', {
      email: signupEmail.value,
      password: signupPassword.value,
      accessCode: signupAccessCode.value
    }, signupBtn, signupMsg));
    [loginEmail, loginPassword, loginAccessCode, signupEmail, signupPassword, signupAccessCode].forEach((input) => {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          if (input === signupEmail || input === signupPassword || input === signupAccessCode) {
            signupBtn.click();
          } else {
            loginBtn.click();
          }
        }
      });
    });
  </script>
</body>
</html>`;
}

function ownerLoginPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VOID MD Owner Access</title>
  <style>
    :root {
      --bg: #05090f;
      --bg2: #0b1525;
      --panel: rgba(10, 16, 28, 0.9);
      --panel-border: rgba(255,255,255,.08);
      --text: #f0f6ff;
      --muted: #9fb0cf;
      --accent: #ffd166;
      --accent2: #77e0c1;
      --shadow: 0 28px 90px rgba(0,0,0,.42);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      color: var(--text);
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(255, 209, 102, .16), transparent 28%),
        radial-gradient(circle at top right, rgba(119, 224, 193, .12), transparent 30%),
        linear-gradient(160deg, var(--bg), var(--bg2) 58%, #05090f);
      padding: 24px;
    }
    .panel {
      width: min(520px, 100%);
      padding: 28px;
      background: var(--panel);
      border: 1px solid var(--panel-border);
      box-shadow: var(--shadow);
      border-radius: 24px;
      backdrop-filter: blur(18px);
    }
    .eyebrow {
      font-size: 11px;
      letter-spacing: .32em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 800;
      margin-bottom: 14px;
    }
    h1 {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 46px;
      line-height: .95;
      margin: 0 0 12px 0;
    }
    p {
      margin: 0;
      color: var(--muted);
      line-height: 1.7;
    }
    label {
      display: block;
      margin: 18px 0 8px;
      color: var(--muted);
      font-size: 13px;
    }
    input, button {
      width: 100%;
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.04);
      color: var(--text);
      font: inherit;
    }
    input:focus {
      outline: none;
      border-color: rgba(255, 209, 102, .55);
      box-shadow: 0 0 0 4px rgba(255, 209, 102, .08);
    }
    button {
      margin-top: 14px;
      border: 0;
      background: linear-gradient(135deg, var(--accent), #8ad9ff);
      color: #05111b;
      font-weight: 900;
      cursor: pointer;
    }
    .small {
      margin-top: 12px;
      color: var(--muted);
      font-size: 13px;
      min-height: 20px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      margin-bottom: 16px;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(255, 209, 102, .12);
      color: var(--accent);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="panel">
    <div class="badge">Owner only</div>
    <div class="eyebrow">VOID MD</div>
    <h1>Owner access</h1>
    <p>This area is separate from regular dashboard login and is protected by the owner password.</p>
    <label for="ownerPassword">Owner password</label>
    <input id="ownerPassword" type="password" autocomplete="current-password" placeholder="Enter owner password" />
    <button id="ownerLoginBtn" type="button">Unlock owner dashboard</button>
    <div class="small" id="ownerLoginMsg"></div>
  </div>
  <script>
    const ownerLoginBtn = document.getElementById('ownerLoginBtn');
    const ownerLoginMsg = document.getElementById('ownerLoginMsg');
    const ownerPassword = document.getElementById('ownerPassword');

    async function loginOwner() {
      ownerLoginBtn.disabled = true;
      ownerLoginMsg.textContent = 'Checking owner access...';
      try {
        const res = await fetch('/api/owner/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: ownerPassword.value })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Owner login failed');
        window.location.href = '/owner';
      } catch (err) {
        ownerLoginMsg.textContent = err.message;
        ownerLoginBtn.disabled = false;
      }
    }

    ownerLoginBtn.addEventListener('click', loginOwner);
    ownerPassword.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') loginOwner();
    });
  </script>
</body>
</html>`;
}

function ownerStats() {
  const targets = listTargets('', true);
  const groups = targets.filter((entry) => entry.kind === 'group');
  const chats = targets.filter((entry) => entry.kind === 'chat');
  const pairs = listPairs('', true);
  const settings = readSettingsSnapshot();
  const banned = Object.entries(settings)
    .filter(([jid, value]) => jid !== 'bot' && value && value.banned)
    .map(([jid]) => jid);
  return {
    activeChats: chats.length,
    bannedUsers: banned.length,
    pairedSessions: pairs.length,
    activeGroups: groups.length,
    banned,
    pairs,
    groups,
    chats,
  };
}

function ownerDashboardPage() {
  const stats = ownerStats();
  return pageShell({
    active: '/owner',
    title: 'Owner Dashboard',
    subtitle: 'VOID MD owner controls, stats, and session management in one private workspace.',
    boot: { owner: true },
    body: `
      <div class="page-shell">
        <div class="panel hero">
          <div class="chips">
            <span class="chip">${stats.activeChats} active chats</span>
            <span class="chip">${stats.bannedUsers} banned users</span>
            <span class="chip">${stats.pairedSessions} paired sessions</span>
            <span class="chip">Owner only</span>
          </div>
          <div class="muted-box">
            This dashboard is locked behind its own password and cookie. Regular dashboard users cannot access this page.
          </div>
        </div>

        <div class="panel section">
          <h2 class="section-title">Target</h2>
          <p class="section-desc">Use this to point the owner controls at a bot, user, chat, or group target.</p>
          <div class="toolbar">
            <input class="field" data-target-input value="bot" placeholder="bot or JID" />
            <button class="primary-btn" type="button" data-target-reload>Load target</button>
          </div>
        </div>

        <div class="grid-4">
          <div class="panel stat">
            <div class="stat-label">Active chats</div>
            <div class="stat-value" id="ownerActiveChats">${stats.activeChats}</div>
            <div class="stat-note">Chats currently tracked in the settings store</div>
          </div>
          <div class="panel stat">
            <div class="stat-label">Banned users</div>
            <div class="stat-value" id="ownerBannedUsers">${stats.bannedUsers}</div>
            <div class="stat-note">Loaded from the existing ban list</div>
          </div>
          <div class="panel stat">
            <div class="stat-label">Paired sessions</div>
            <div class="stat-value" id="ownerPairedSessions">${stats.pairedSessions}</div>
            <div class="stat-note">Synced from MongoDB Atlas</div>
          </div>
          <div class="panel stat">
            <div class="stat-label">Tracked groups</div>
            <div class="stat-value" id="ownerActiveGroups">${stats.activeGroups}</div>
            <div class="stat-note">Group targets with stored metadata</div>
          </div>
        </div>

        <div class="page-grid">
          <div class="section-columns">
            <div class="panel section">
              <h2 class="section-title">Owner Access</h2>
              <p class="section-desc">This page is separate from the regular dashboard and uses its own protected login.</p>
              <div class="muted-box">If you need the regular dashboard, use the Regular Dashboard button in the top bar.</div>
            </div>

            <div class="panel section">
              <h2 class="section-title">Owner Settings</h2>
              <p class="section-desc">These owner-only controls already exist in the bot as stored settings, presented here in a cleaner web form.</p>
              <div class="control-group">
                ${CONTROL_CATALOG.filter((item) => item.page === 'business' || item.key === 'mode').map(controlCard).join('')}
              </div>
            </div>

            <div class="panel section">
              <h2 class="section-title">User Security</h2>
              <p class="section-desc">Ban and unban use the same existing settings the bot reads, so the dashboard stays in sync.</p>
              <div class="toolbar">
                <input class="field" id="ownerTarget" placeholder="234xxxxxxxx@s.whatsapp.net" />
                <button class="primary-btn" type="button" id="banBtn">Ban user</button>
                <button class="ghost-btn" type="button" id="unbanBtn">Unban user</button>
                <button class="ghost-btn" type="button" id="ownerTargetCopy">Copy ID</button>
              </div>
              <div class="muted-box" id="ownerActionStatus">Ready.</div>
            </div>

            <div class="panel section">
              <h2 class="section-title">Owner Commands</h2>
              <p class="section-desc">Command reference for owner-level actions already available in the bot.</p>
              <div class="list">
                ${[
                  { name: 'ban', usage: 'ban @user', note: 'Mark a user as banned.' },
                  { name: 'unban', usage: 'unban @user', note: 'Clear a ban.' },
                  { name: 'resetlink', usage: 'resetlink', note: 'Revoke the current group invite link.' },
                  { name: 'mute', usage: 'mute', note: 'Close a group to members.' },
                  { name: 'unmute', usage: 'unmute', note: 'Open the group back up.' },
                  { name: 'kickall', usage: 'kickall', note: 'Remove non-admin members.' },
                  { name: 'kickadmins', usage: 'kickadmins', note: 'Remove admins except the bot and owner.' },
                  { name: 'tagall', usage: 'tagall message', note: 'Mention every member.' },
                  { name: 'hidetag', usage: 'hidetag message', note: 'Send a hidden mention.' },
                  { name: 'promote', usage: 'promote @user', note: 'Promote a member.' },
                  { name: 'demote', usage: 'demote @user', note: 'Demote a member.' }
                ].map(guideCard).join('')}
              </div>
            </div>
          </div>
          <div class="section panel">
            <h2 class="section-title">Paired Sessions</h2>
            <p class="section-desc">These are the current WhatsApp sessions visible to the owner at a glance.</p>
            <div id="ownerPairs" class="pair-list"></div>
          </div>
        </div>
      </div>
    `,
    script: `
      (async () => {
        await Dashboard.loadState();
        const stats = await Dashboard.request('/api/owner/state');
        const statMap = {
          ownerActiveChats: stats.activeChats,
          ownerBannedUsers: stats.bannedUsers,
          ownerPairedSessions: stats.pairedSessions,
          ownerActiveGroups: stats.activeGroups
        };
        Object.entries(statMap).forEach(([id, value]) => {
          const el = document.getElementById(id);
          if (el) el.textContent = String(value);
        });
        const pairContainer = document.getElementById('ownerPairs');
        if (pairContainer) {
          if (!stats.pairs.length) {
            pairContainer.innerHTML = '<div class="muted-box">No paired sessions yet.</div>';
          } else {
            pairContainer.innerHTML = stats.pairs.map((item) => '<div class="pair-card"><div><div class="target-title">' + item.name + '</div><div class="target-meta">' + item.path + '</div></div><button class="ghost-btn danger-btn" type="button" data-owner-remove-pair="' + item.name + '">Remove</button></div>').join('');
            pairContainer.querySelectorAll('[data-owner-remove-pair]').forEach((button) => {
              if (button.dataset.bound === '1') return;
              button.dataset.bound = '1';
              button.addEventListener('click', async () => {
                const target = button.getAttribute('data-owner-remove-pair');
                if (!window.confirm('Remove this paired session?')) return;
                await Dashboard.removePair(target);
                Dashboard.showToast('Session removed');
                window.location.reload();
              });
            });
          }
        }

        const status = document.getElementById('ownerActionStatus');
        const targetInput = document.getElementById('ownerTarget');
        const banBtn = document.getElementById('banBtn');
        const unbanBtn = document.getElementById('unbanBtn');
        const ownerTargetCopy = document.getElementById('ownerTargetCopy');

        if (ownerTargetCopy && !ownerTargetCopy.dataset.bound) {
          ownerTargetCopy.dataset.bound = '1';
          ownerTargetCopy.addEventListener('click', async () => {
            const raw = (targetInput.value || '').trim();
            if (!raw) return;
            const text = raw.includes('@') ? raw : raw.replace(/\\D/g, '') + '@s.whatsapp.net';
            await navigator.clipboard.writeText(text).catch(() => {});
            status.textContent = 'Target copied.';
          });
        }

        async function updateBan(value) {
          const target = (targetInput.value || '').trim();
          if (!target) {
            status.textContent = 'Enter a user JID or number first.';
            return;
          }
          status.textContent = value ? 'Banning user...' : 'Unbanning user...';
          await Dashboard.request('/api/setting', {
            method: 'POST',
            body: JSON.stringify({
              target: target.includes('@') ? target : target.replace(/\\D/g, '') + '@s.whatsapp.net',
              key: 'banned',
              value
            })
          });
          status.textContent = value ? 'User banned.' : 'User unbanned.';
          Dashboard.showToast(value ? 'User banned' : 'User unbanned');
        }

        if (banBtn && !banBtn.dataset.bound) {
          banBtn.dataset.bound = '1';
          banBtn.addEventListener('click', () => updateBan(true).catch((err) => status.textContent = err.message));
        }
        if (unbanBtn && !unbanBtn.dataset.bound) {
          unbanBtn.dataset.bound = '1';
          unbanBtn.addEventListener('click', () => updateBan(false).catch((err) => status.textContent = err.message));
        }
      })();
    `
  });
}

function homePage(scopeSessionId = '', isOwner = false) {
  const pairs = listPairs(scopeSessionId, isOwner);
  return pageShell({
    active: '/',
    title: 'Welcome',
    subtitle: 'Get started by linking your WhatsApp or selecting an active session.',
    hasAccount: !!scopeSessionId,
    body: `
      <div class="page-shell">
        <div class="cards-2">
          <a class="panel section" href="/pairing">
            <div class="section-title">Link Account</div>
            <div class="section-desc">Connect a new phone to the bot.</div>
          </a>
          <a class="panel section" href="/accounts">
            <div class="section-title">Active Sessions</div>
            <div class="section-desc">Manage your existing connected devices.</div>
          </a>
        </div>
      </div>
    `
  });
}

function accountsPage(accountId = '', selectedSessionId = '') {
  return pageShell({
    active: '/accounts',
    title: 'Accounts',
    subtitle: 'Choose a paired WhatsApp, then open the command center for that exact session.',
    boot: { defaultTarget: selectedSessionId || 'bot' },
    body: `
      <div class="page-shell">
        <div class="panel hero">
          <div class="chips">
            <span class="chip">Account scoped</span>
            <span class="chip">Paired WhatsApps only</span>
            <span class="chip">Commands apply to one selected session</span>
          </div>
          <div class="muted-box">
            Select a paired WhatsApp first. That selection becomes the active session for commands, groups, chats, and reminders.
          </div>
        </div>

        <div class="grid-4">
          <div class="panel stat">
            <div class="stat-label">Paired WhatsApps</div>
            <div class="stat-value" id="accountPairsCount">0</div>
            <div class="stat-note">Linked to your account</div>
          </div>
          <div class="panel stat">
            <div class="stat-label">Selected session</div>
            <div class="stat-value" id="accountSelected">${escapeHtml(selectedSessionId || '-')}</div>
            <div class="stat-note">Used by the command center</div>
          </div>
          <div class="panel stat">
            <div class="stat-label">Account</div>
            <div class="stat-value">${accountId ? 'Active' : 'Unknown'}</div>
            <div class="stat-note">Web login state</div>
          </div>
          <div class="panel stat">
            <div class="stat-label">Next step</div>
            <div class="stat-value">Commands</div>
            <div class="stat-note">Open after selection</div>
          </div>
        </div>

        <div class="panel section">
          <h2 class="section-title">Paired WhatsApps</h2>
          <p class="section-desc">Pick one session to manage. Then open the command center for that exact WhatsApp.</p>
          <div id="accountPairList" class="pair-list"></div>
        </div>
      </div>
    `,
    script: `
      (async () => {
        const pairList = document.getElementById('accountPairList');
        const countEl = document.getElementById('accountPairsCount');
        const selectedEl = document.getElementById('accountSelected');
        try {
          const data = await Dashboard.listAccountSessions();
          const sessions = data.sessions || [];
          if (countEl) countEl.textContent = String(sessions.length);
          if (!sessions.length) {
            if (pairList) pairList.innerHTML = '<div class="muted-box">No paired WhatsApps are linked yet. Go to Pairing to add one.</div>';
            return;
          }
          pairList.innerHTML = sessions.map((item) => {
            const selected = ${JSON.stringify(selectedSessionId || '')} === item.sessionId ? 'Selected' : 'Open';
            return '<div class="pair-card">' +
              '<div>' +
                '<div class="target-title">' + (item.name || item.sessionId) + '</div>' +
                '<div class="target-meta">' + item.sessionId + '<br />' + (item.status || 'unknown') + '</div>' +
              '</div>' +
              '<div class="row-actions">' +
                '<button class="ghost-btn" type="button" data-select-session="' + item.sessionId + '">' + selected + '</button>' +
                '<a class="primary-btn" href="/commands?target=' + encodeURIComponent(item.sessionId) + '">Open commands</a>' +
              '</div>' +
            '</div>';
          }).join('');
          pairList.querySelectorAll('[data-select-session]').forEach((button) => {
            if (button.dataset.bound === '1') return;
            button.dataset.bound = '1';
            button.addEventListener('click', async () => {
              const sessionId = button.getAttribute('data-select-session');
              if (!sessionId) return;
              await Dashboard.selectAccountSession(sessionId);
              if (selectedEl) selectedEl.textContent = sessionId;
              window.location.href = '/commands?target=' + encodeURIComponent(sessionId);
            });
          });
        } catch (err) {
          if (pairList) pairList.innerHTML = '<div class="muted-box">' + err.message + '</div>';
        }
      })();
    `
  });
}

function commandPage(activeTarget, lockedTarget = false) {
  const sections = ['System', 'Groups', 'Business'];
  const grouped = sections.map((section) => {
    return `
      <div class="panel section" style="cursor:pointer" onclick="Dashboard.openSettingsSection('${section}')">
        <h2 class="section-title">${escapeHtml(section)} Settings</h2>
        <p class="section-desc">Manage ${escapeHtml(section.toLowerCase())} features and bot behavior.</p>
      </div>`;
  }).join('');

  return pageShell({
    active: '/commands',
    title: 'Command Management',
    subtitle: 'Grouped controls for bot, group, and business settings.',
    boot: { defaultTarget: activeTarget || 'bot', lockedTarget },
    body: `
      <div class="page-shell">
        <div class="panel section">
          <h2 class="section-title">Target</h2>
          <p class="section-desc">${lockedTarget ? 'Locked to your paired session.' : 'Use a bot, chat, or group JID.'}</p>
          ${lockedTarget ? `<div class="muted-box">Linked session: <strong>${escapeHtml(activeTarget || 'bot')}</strong></div>` : `<div class="toolbar"><input class="field" data-target-input value="${escapeHtml(activeTarget || 'bot')}" placeholder="bot or JID" /><button class="primary-btn" type="button" data-target-reload>Load target</button></div>`}
        </div>

        <div class="grid-4">
          <div class="panel stat"><div class="stat-label">Settings keys</div><div class="stat-value" id="summaryKeys">0</div></div>
          <div class="panel stat"><div class="stat-label">Active flags</div><div class="stat-value" id="summaryActive">0</div></div>
          <div class="panel stat"><div class="stat-label">Pairs</div><div class="stat-value" id="summaryPairs">0</div></div>
          <div class="panel stat"><div class="stat-label">Mode</div><div class="stat-value" id="summaryMode">public</div></div>
        </div>

        <div class="page-shell">
          <div class="cards-3">${grouped}</div>
          <div class="section panel">
            <h2 class="section-title">Command Reference</h2>
            <p class="section-desc">Command references grouped by purpose.</p>
            <div class="list">${COMMAND_GUIDES.groups.concat(COMMAND_GUIDES.business, COMMAND_GUIDES.chats).map(guideCard).join('')}</div>
          </div>
        </div>
      </div>
    `,
    script: `
      (async () => {
        window.__BOOT.controlCatalog = ${JSON.stringify(CONTROL_CATALOG)};
        window.__LATEST_STATE = await Dashboard.loadState();
      })();
    `
  });
}

function groupsPage(activeTarget) {
  const target = activeTarget || 'bot';
  return pageShell({
    active: '/groups',
    title: 'Group Tools',
    subtitle: 'Manage your group interactions and automated tools.',
    boot: { defaultTarget: target },
    hasAccount: true,
    body: `
      <div class="page-shell">
        <div class="cards-2">
          <div class="panel section" style="cursor:pointer" onclick="Dashboard.openSettingsSection('Group Controls')">
            <h2 class="section-title">Automation Settings</h2>
            <p class="section-desc">Configure welcome messages and link protection.</p>
          </div>
          <div class="panel section" style="cursor:pointer" onclick="Dashboard.openModal(document.getElementById('tpl-group-list').innerHTML)">
            <h2 class="section-title">Tracked Groups</h2>
            <p class="section-desc">View and select from your list of active groups.</p>
          </div>
        </div>
        <div class="panel section">
            <h2 class="section-title">Active Reminder Queue</h2>
            <div id="targetList" class="list"></div>
        </div>
      </div>
      <template id="tpl-group-list"><div class="section"><h2 class="section-title">My Groups</h2><div id="modalTargetList" class="list"></div></div></template>
    `,
    script: `
      (async () => {
        const data = await Dashboard.loadState();
        Dashboard.renderTargets(data.groups, 'targetList', '/groups/view');
        
        window.showGroupList = () => {
           Dashboard.openModal(document.getElementById('tpl-group-list').innerHTML);
           Dashboard.renderTargets(data.groups, 'modalTargetList', '/groups/view');
        };
      })();
    `
  });
}

function businessPage(activeTarget) {
  return pageShell({
    active: '/business',
    title: 'Automations',
    subtitle: 'Personal and chat automation settings.',
    boot: { defaultTarget: activeTarget || 'bot' },
    hasAccount: true,
    body: `
      <div class="page-shell">
        <div class="cards-2">
          <div class="panel section" style="cursor:pointer" onclick="Dashboard.openSettingsSection('Chat Automation')">
            <h2 class="section-title">Chat Filters</h2>
            <p class="section-desc">Manage spam, bad language, and auto-replies.</p>
          </div>
          <div class="panel section" style="cursor:pointer" onclick="Dashboard.openSettingsSection('Personal Automation')">
            <h2 class="section-title">Profile Tools</h2>
            <p class="section-desc">Manage your bio, read receipts, and status views.</p>
          </div>
        </div>
        <div class="panel section">
            <h2 class="section-title">Tracked Individual Chats</h2>
            <div id="targetList" class="list"></div>
        </div>
      </div>
    `,
    script: `
      (async () => {
        const data = await Dashboard.loadState();
        Dashboard.renderTargets(data.chats, 'targetList', '/commands');
      })();
    `
  });
}

function chatsPage() {
  return pageShell({
    active: '/chats',
    title: 'Chats',
    subtitle: 'Browse chat and user targets.',
    boot: { defaultTarget: 'bot' },
    body: `
      <div class="page-shell">
        <div class="panel hero">
          <div class="chips">
            <span class="chip">Chat targets from settings.json</span>
            <span class="chip">Use the Open button to jump to commands</span>
            <span class="chip">Separate from groups</span>
          </div>
          <div class="muted-box">Uses the existing settings store.</div>
        </div>

        <div class="cards-3">
          <div class="panel stat">
            <div class="stat-label">Tracked chats</div>
            <div class="stat-value" id="summaryChats">0</div>
            <div class="stat-note">Targets from the settings store</div>
          </div>
          <div class="panel stat">
            <div class="stat-label">Tracked groups</div>
            <div class="stat-value" id="summaryGroups">0</div>
            <div class="stat-note">Group targets live on Groups</div>
          </div>
          <div class="panel stat">
            <div class="stat-label">Paired sessions</div>
            <div class="stat-value" id="summaryPairs">0</div>
            <div class="stat-note">Sessions in richstore/pairing</div>
          </div>
        </div>

        <div class="panel section">
          <h2 class="section-title">Chat Targets</h2>
          <p class="section-desc">Non-group JIDs from the settings store.</p>
          <div id="targetList" class="list"></div>
        </div>
      </div>
    `,
    script: `
      (async () => {
        const data = await Dashboard.loadState();
        Dashboard.renderTargets(data.chats, 'targetList', '/chats/view');
      })();
    `
  });
}

function groupDetailPage(activeTarget) {
  const target = activeTarget || 'bot';
  const cards = CONTROL_CATALOG.filter((item) => item.page === 'groups').map(controlCard).join('');
  const guides = COMMAND_GUIDES.groups.map(guideCard).join('');
  return pageShell({
    active: '/groups',
    title: 'Group Detail',
    subtitle: 'Manage one group and its reminder here.',
    boot: { defaultTarget: target },
    body: `
      <div class="page-shell">
        <div class="panel section">
          <h2 class="section-title">Selected group</h2>
          <p class="section-desc">Open a group or paste its JID.</p>
          <div class="toolbar">
            <input class="field" data-target-input value="${escapeHtml(target)}" placeholder="1203...@g.us" />
            <button class="primary-btn" type="button" data-target-reload>Load group</button>
          </div>
        </div>

        <div class="grid-4">
          <div class="panel stat"><div class="stat-label">Group name</div><div class="stat-value" id="summaryName">-</div></div>
          <div class="panel stat"><div class="stat-label">Group JID</div><div class="stat-value inline-copy-value"><span id="summaryJid">-</span><button class="ghost-btn tiny-btn" type="button" id="summaryJidCopy">Copy</button></div></div>
          <div class="panel stat"><div class="stat-label">Settings</div><div class="stat-value" id="summaryKeys">0</div></div>
          <div class="panel stat"><div class="stat-label">Active flags</div><div class="stat-value" id="summaryActive">0</div></div>
        </div>

        <div class="page-grid">
          <div class="section-columns">
            <div class="panel section">
              <h2 class="section-title">Group Controls</h2>
              <p class="section-desc">Group controls.</p>
              <div class="control-group">${cards}</div>
            </div>
            <div class="panel section">
              <h2 class="section-title">gc-reminder</h2>
              <p class="section-desc">Schedule a reminder for this group.</p>
              <div class="toolbar">
                <input class="field" id="gcReminderDate" type="date" />
                <input class="field" id="gcReminderTime" type="time" />
              </div>
              <textarea class="field" id="gcReminderMessage" rows="4" placeholder="Reminder text"></textarea>
              <label class="switch"><input id="gcReminderTagAll" type="checkbox" checked /> <span class="switch-label">Tag all members</span></label>
              <div class="toolbar">
                <button class="primary-btn" type="button" id="gcReminderBtn">Schedule reminder</button>
                <a class="ghost-btn" href="/reminders?target=${encodeURIComponent(target)}">Open reminders</a>
              </div>
              <div class="muted-box" id="gcReminderStatus">Uses the existing reminder queue.</div>
            </div>
            <div class="panel section">
              <h2 class="section-title">Group Commands</h2>
              <p class="section-desc">Group command references.</p>
              <div class="list">${guides}</div>
            </div>
          </div>
          <div class="section panel">
            <h2 class="section-title">Tracked Groups</h2>
            <p class="section-desc">Names and IDs only.</p>
            <div id="targetList" class="list"></div>
          </div>
        </div>
      </div>
    `,
    script: `
      (async () => {
        const input = document.querySelector('[data-target-input]');
        const target = (input && input.value.trim()) || '${escapeHtml(target)}';
        const data = await Dashboard.loadState();
        const group = (data.targets || []).find((entry) => entry.jid === target) || { name: target, jid: target, keyCount: 0, activeCount: 0 };
        const nameEl = document.getElementById('summaryName');
        const jidEl = document.getElementById('summaryJid');
        const jidCopy = document.getElementById('summaryJidCopy');
        if (nameEl) nameEl.textContent = group.name || group.jid || target;
        if (jidEl) jidEl.textContent = group.jid || target;
        if (jidCopy && !jidCopy.dataset.bound) {
          jidCopy.dataset.bound = '1';
          jidCopy.addEventListener('click', async () => {
            const text = (jidEl?.textContent || '').trim();
            if (!text || text === '-') return;
            await navigator.clipboard.writeText(text).catch(() => {});
          });
        }
        Dashboard.renderTargets(data.groups, 'targetList', '/groups/view');

        const btn = document.getElementById('gcReminderBtn');
        const status = document.getElementById('gcReminderStatus');
        if (btn && !btn.dataset.bound) {
          btn.dataset.bound = '1';
          btn.addEventListener('click', async () => {
            const date = document.getElementById('gcReminderDate').value;
            const time = document.getElementById('gcReminderTime').value;
            const message = document.getElementById('gcReminderMessage').value.trim();
            const tagAll = document.getElementById('gcReminderTagAll').checked;
            if (!date || !time || !message) {
              status.textContent = 'Pick a date, time, and message first.';
              return;
            }
            const runAt = new Date(date + 'T' + time).toISOString();
            btn.disabled = true;
            status.textContent = 'Saving reminder...';
            try {
              await Dashboard.createReminder({ target: (document.querySelector('[data-target-input]')?.value || '${escapeHtml(target)}').trim(), runAt, message, tagAll });
              status.textContent = 'Reminder saved. The bot will deliver it at the scheduled time.';
              Dashboard.showToast('Reminder scheduled');
            } catch (err) {
              status.textContent = err.message;
            } finally {
              btn.disabled = false;
            }
          });
        }
      })();
    `
  });
}

function chatDetailPage(activeTarget) {
  const target = activeTarget || 'bot';
  const cards = CONTROL_CATALOG.filter((item) => item.page === 'business').map(controlCard).join('');
  const guides = COMMAND_GUIDES.chats.map(guideCard).join('');
  return pageShell({
    active: '/chats',
    title: 'Chat Detail',
    subtitle: 'Manage one chat or user here.',
    boot: { defaultTarget: target },
    body: `
      <div class="page-shell">
        <div class="panel section">
          <h2 class="section-title">Selected chat</h2>
          <p class="section-desc">Open a chat or paste its JID.</p>
          <div class="toolbar">
            <input class="field" data-target-input value="${escapeHtml(target)}" placeholder="user or chat JID" />
            <button class="primary-btn" type="button" data-target-reload>Load chat</button>
          </div>
        </div>

        <div class="grid-4">
          <div class="panel stat"><div class="stat-label">Chat name</div><div class="stat-value" id="summaryName">-</div></div>
          <div class="panel stat"><div class="stat-label">Chat JID</div><div class="stat-value inline-copy-value"><span id="summaryJid">-</span><button class="ghost-btn tiny-btn" type="button" id="summaryJidCopy">Copy</button></div></div>
          <div class="panel stat"><div class="stat-label">Settings</div><div class="stat-value" id="summaryKeys">0</div></div>
          <div class="panel stat"><div class="stat-label">Active flags</div><div class="stat-value" id="summaryActive">0</div></div>
        </div>

        <div class="page-grid">
          <div class="section-columns">
            <div class="panel section">
              <h2 class="section-title">Business Controls</h2>
              <p class="section-desc">Business controls.</p>
              <div class="control-group">${cards}</div>
            </div>
            <div class="panel section">
              <h2 class="section-title">Command Reference</h2>
              <p class="section-desc">Chat command references.</p>
              <div class="list">${guides}</div>
              <div class="toolbar" style="margin-top: 12px;">
                <a class="ghost-btn" href="/reminders?target=${encodeURIComponent(target)}">Open reminders</a>
              </div>
            </div>
          </div>
          <div class="section panel">
            <h2 class="section-title">Tracked Chats</h2>
            <p class="section-desc">Names and IDs only.</p>
            <div id="targetList" class="list"></div>
          </div>
        </div>
      </div>
    `,
    script: `
      (async () => {
        const input = document.querySelector('[data-target-input]');
        const target = (input && input.value.trim()) || '${escapeHtml(target)}';
        const data = await Dashboard.loadState();
        const chat = (data.targets || []).find((entry) => entry.jid === target) || { name: target, jid: target, keyCount: 0, activeCount: 0 };
        const nameEl = document.getElementById('summaryName');
        const jidEl = document.getElementById('summaryJid');
        const jidCopy = document.getElementById('summaryJidCopy');
        if (nameEl) nameEl.textContent = chat.name || chat.jid || target;
        if (jidEl) jidEl.textContent = chat.jid || target;
        if (jidCopy && !jidCopy.dataset.bound) {
          jidCopy.dataset.bound = '1';
          jidCopy.addEventListener('click', async () => {
            const text = (jidEl?.textContent || '').trim();
            if (!text || text === '-') return;
            await navigator.clipboard.writeText(text).catch(() => {});
          });
        }
        Dashboard.renderTargets(data.chats, 'targetList', '/chats/view');
      })();
    `
  });
}

function remindersPage(activeTarget) {
  const target = activeTarget || 'bot';
  return pageShell({
    active: '/reminders',
    title: 'My Reminders',
    subtitle: 'Schedule and manage automated messages.',
    boot: { defaultTarget: target },
    hasAccount: true,
    body: `
      <div class="page-shell">
        <div class="grid-4">
          <div class="panel stat"><div class="stat-label">Upcoming</div><div class="stat-value" id="remStatUpcoming">0</div><div class="stat-note">Pending reminders ahead of time</div></div>
          <div class="panel stat"><div class="stat-label">Recurring</div><div class="stat-value" id="remStatRecurring">0</div><div class="stat-note">Daily, weekly, monthly, yearly, custom</div></div>
          <div class="panel stat"><div class="stat-label">Past</div><div class="stat-value" id="remStatPast">0</div><div class="stat-note">Completed, sent, or deleted reminders</div></div>
          <div class="panel stat"><div class="stat-label">Selected target</div><div class="stat-value" id="remStatTarget">${escapeHtml(target)}</div><div class="stat-note">Current dashboard scope</div></div>
        </div>

        <div class="cards-3">
          <div class="panel section" style="cursor:pointer" onclick="Dashboard.openModal(document.getElementById('tpl-reminder-form').innerHTML)">
            <h2 class="section-title">New Reminder</h2>
            <p class="section-desc">Create a one-time or repeating alert.</p>
          </div>
          <div class="panel section" style="cursor:pointer" onclick="Dashboard.openModal(document.getElementById('tpl-reminder-prefs').innerHTML)">
            <h2 class="section-title">Preferences</h2>
            <p class="section-desc">Set your default timezone and quiet hours.</p>
          </div>
        </div>

        <div class="section panel">
            <h2 class="section-title">Active Reminder Queue</h2>
            <div class="toolbar">
              <button class="ghost-btn" type="button" data-view-btn="upcoming">Upcoming</button>
              <button class="ghost-btn" type="button" data-view-btn="recurring">Recurring</button>
              <button class="ghost-btn" type="button" data-view-btn="past">Past</button>
              <button class="ghost-btn" type="button" data-view-btn="all">All</button>
            </div>
            <div id="reminderList" class="list"></div>
        </div>
      </div>
      <!-- Hidden Templates for Modals -->
      <template id="tpl-reminder-form">
        <div class="section">
          <h2 class="section-title">Schedule New Reminder</h2>
          <p class="section-desc">Fill in the details below to set a message alert.</p>
          <div class="toolbar">
            <input class="field" id="remTarget" placeholder="Phone number or Group ID" />
            <select class="field" id="remTargetType"><option value="chat">Direct Chat</option><option value="group">Group Chat</option></select>
          </div>
          <textarea class="field" id="remNaturalText" rows="2" placeholder="e.g., Remind me to call John in 2 hours"></textarea>
          <div class="toolbar">
            <button class="ghost-btn tiny-btn" id="parseBtn">Auto-Fill from Text</button>
            <label class="switch"><input id="remUseNatLang" type="checkbox" /> <span class="switch-label">Use Smart Parsing</span></label>
          </div>
          <div class="toolbar">
            <input class="field" id="remDate" type="date" />
            <input class="field" id="remTime" type="time" />
          </div>
          <textarea class="field" id="remMessage" rows="3" placeholder="Message content"></textarea>
          <div class="toolbar">
            <select class="field" id="remRecurrence">
              <option value="none">One-time</option>
              <option value="daily">Every day</option>
              <option value="weekly">Every week</option>
            </select>
            <input class="field" id="remAdvanceMinutes" type="number" placeholder="Alert mins early" />
          </div>
          <button class="primary-btn" id="saveReminderBtn">Create Reminder</button>
          <div class="small" id="reminderStatus"></div>
        </div>
      </template>
      <template id="tpl-reminder-prefs">
        <div class="section">
          <h2 class="section-title">My Preferences</h2>
          <p class="section-desc">Set your local time behavior.</p>
          <label>Timezone</label>
          <input class="field" id="prefTimezone" placeholder="Africa/Lagos" />
          <label>Default Daily Time</label>
          <input class="field" id="prefDefaultTime" type="time" />
          <div class="toolbar" style="margin-top:15px">
            <label class="switch"><input id="prefQuietEnabled" type="checkbox" /> <span class="switch-label">Do Not Disturb</span></label>
          </div>
          <div class="toolbar">
            <input class="field" id="prefQuietStart" type="time" placeholder="Start" />
            <input class="field" id="prefQuietEnd" type="time" placeholder="End" />
          </div>
          <button class="primary-btn" id="savePrefBtn" style="margin-top:15px">Save My Settings</button>
          <div class="small" id="prefStatus"></div>
        </div>
      </template>
    `,
    script: `
      (async () => {
        const state = {
          view: 'upcoming',
          prefs: {},
          reminders: [],
          editingId: '',
        };

        const els = {
          timezone: document.getElementById('prefTimezone'),
          defaultTime: document.getElementById('prefDefaultTime'),
          timeFormat: document.getElementById('prefTimeFormat'),
          dateFormat: document.getElementById('prefDateFormat'),
          advanceMinutes: document.getElementById('prefAdvanceMinutes'),
          mentionMode: document.getElementById('prefMentionMode'),
          quietStart: document.getElementById('prefQuietStart'),
          quietEnd: document.getElementById('prefQuietEnd'),
          natLang: document.getElementById('prefNatLang'),
          quietEnabled: document.getElementById('prefQuietEnabled'),
          prefStatus: document.getElementById('prefStatus'),
          remTarget: document.getElementById('remTarget'),
          remTargetType: document.getElementById('remTargetType'),
          remNaturalText: document.getElementById('remNaturalText'),
          remUseNatLang: document.getElementById('remUseNatLang'),
          remDate: document.getElementById('remDate'),
          remTime: document.getElementById('remTime'),
          remMessage: document.getElementById('remMessage'),
          remRecurrence: document.getElementById('remRecurrence'),
          remInterval: document.getElementById('remInterval'),
          remWeekday: document.getElementById('remWeekday'),
          remOrdinal: document.getElementById('remOrdinal'),
          remAdvanceMinutes: document.getElementById('remAdvanceMinutes'),
          remSnoozeMinutes: document.getElementById('remSnoozeMinutes'),
          remMentionMode: document.getElementById('remMentionMode'),
          remMentionJids: document.getElementById('remMentionJids'),
          remAckAction: document.getElementById('remAckAction'),
          remTagAll: document.getElementById('remTagAll'),
          remQuietEnabled: document.getElementById('remQuietEnabled'),
          reminderStatus: document.getElementById('reminderStatus'),
          reminderList: document.getElementById('reminderList'),
          savePrefBtn: document.getElementById('savePrefBtn'),
          saveReminderBtn: document.getElementById('saveReminderBtn'),
          resetReminderBtn: document.getElementById('resetReminderBtn'),
          parseBtn: document.getElementById('parseBtn'),
          bulkDeleteBtn: document.getElementById('bulkDeleteBtn'),
          bulkCompleteBtn: document.getElementById('bulkCompleteBtn'),
        };

        function setStatus(message) {
          if (els.reminderStatus) els.reminderStatus.textContent = message;
        }

        function setPrefStatus(message) {
          if (els.prefStatus) els.prefStatus.textContent = message;
        }

        function normalizeLocaleFromFormat(format) {
          if (format === 'MM/DD/YYYY') return 'en-US';
          if (format === 'YYYY-MM-DD') return 'sv-SE';
          return 'en-GB';
        }

        function formatReminderTime(iso, prefs) {
          const date = new Date(iso);
          if (Number.isNaN(date.getTime())) return '-';
          const locale = normalizeLocaleFromFormat(prefs.dateFormat);
          const timeStyle = prefs.timeFormat === '12h' ? { hour: 'numeric', minute: '2-digit', hour12: true } : { hour: '2-digit', minute: '2-digit', hour12: false };
          const dateStyle = { year: 'numeric', month: '2-digit', day: '2-digit' };
          const formatter = new Intl.DateTimeFormat(locale, {
            timeZone: prefs.timezone || 'Africa/Lagos',
            ...dateStyle,
            ...timeStyle,
          });
          return formatter.format(date);
        }

        function reminderBadge(reminder) {
          const parts = [];
          if (reminder.recurrenceType && reminder.recurrenceType !== 'none') parts.push(reminder.recurrenceType);
          if (reminder.kind === 'advance') parts.push('advance');
          if (reminder.mentionMode && reminder.mentionMode !== 'none') parts.push(reminder.mentionMode);
          if (reminder.tagAll) parts.push('@all');
          return parts.length ? parts.join(' | ') : 'one-time';
        }

        function readPrefs() {
          return {
            timezone: String(els.timezone.value || 'Africa/Lagos').trim() || 'Africa/Lagos',
            defaultTime: String(els.defaultTime.value || '09:00').trim() || '09:00',
            timeFormat: els.timeFormat.value || '24h',
            dateFormat: els.dateFormat.value || 'DD/MM/YYYY',
            naturalLanguageEnabled: els.natLang.checked,
            advanceMinutes: Number(els.advanceMinutes.value || 0),
            mentionMode: els.mentionMode.value || 'none',
            quietHoursEnabled: els.quietEnabled.checked,
            quietHoursStart: String(els.quietStart.value || '').trim(),
            quietHoursEnd: String(els.quietEnd.value || '').trim(),
          };
        }

        function readForm() {
          return {
            target: (els.remTarget.value || '').trim(),
            targetType: els.remTargetType.value || 'chat',
            text: (els.remNaturalText.value || '').trim(),
            naturalLanguageEnabled: els.remUseNatLang.checked,
            date: els.remDate.value,
            time: els.remTime.value,
            message: (els.remMessage.value || '').trim(),
            recurrenceType: els.remRecurrence.value || 'none',
            recurrenceInterval: Number(els.remInterval.value || 1),
            recurrenceWeekday: els.remWeekday.value,
            recurrenceOrdinal: els.remOrdinal.value,
            advanceMinutes: Number(els.remAdvanceMinutes.value || 0),
            snoozeMinutes: Number(els.remSnoozeMinutes.value || 15),
            mentionMode: els.remMentionMode.value || 'none',
            mentionJids: (els.remMentionJids.value || '').trim(),
            ackAction: els.remAckAction.value || 'keep',
            tagAll: els.remTagAll.checked,
            quietHoursEnabled: els.remQuietEnabled.checked,
          };
        }

        function fillForm(reminder) {
          state.editingId = reminder?._id || '';
          els.remTarget.value = reminder?.chatJid || els.remTarget.value || '';
          els.remTargetType.value = reminder?.targetType || (String(reminder?.chatJid || '').endsWith('@g.us') ? 'group' : 'chat');
          els.remNaturalText.value = reminder?.sourceText || '';
          els.remUseNatLang.checked = Boolean(reminder?.naturalLanguageEnabled);
          const runAt = reminder?.runAt ? new Date(reminder.runAt) : null;
          if (runAt && !Number.isNaN(runAt.getTime())) {
            els.remDate.value = runAt.toISOString().slice(0, 10);
            els.remTime.value = runAt.toISOString().slice(11, 16);
          }
          els.remMessage.value = reminder?.message || '';
          els.remRecurrence.value = reminder?.recurrenceType || 'none';
          els.remInterval.value = reminder?.recurrenceInterval || 1;
          els.remWeekday.value = reminder?.recurrenceWeekday ?? '';
          els.remOrdinal.value = reminder?.recurrenceOrdinal ?? '';
          els.remAdvanceMinutes.value = reminder?.advanceMinutes || 0;
          els.remSnoozeMinutes.value = reminder?.snoozeMinutes || 15;
          els.remMentionMode.value = reminder?.mentionMode || 'none';
          els.remMentionJids.value = Array.isArray(reminder?.mentionJids) ? reminder.mentionJids.join(', ') : '';
          els.remAckAction.value = reminder?.ackAction || 'keep';
          els.remTagAll.checked = Boolean(reminder?.tagAll);
          els.remQuietEnabled.checked = Boolean(reminder?.quietHoursEnabled);
          if (state.editingId) {
            els.saveReminderBtn.textContent = 'Update reminder';
            setStatus('Editing reminder ' + state.editingId);
          } else {
            els.saveReminderBtn.textContent = 'Save reminder';
          }
        }

        async function loadPrefs() {
          const response = await Dashboard.loadReminderPrefs();
          state.prefs = response.prefs || {};
          els.timezone.value = state.prefs.timezone || 'Africa/Lagos';
          els.defaultTime.value = state.prefs.defaultTime || '09:00';
          els.timeFormat.value = state.prefs.timeFormat || '24h';
          els.dateFormat.value = state.prefs.dateFormat || 'DD/MM/YYYY';
          els.advanceMinutes.value = state.prefs.advanceMinutes || 0;
          els.mentionMode.value = state.prefs.mentionMode || 'none';
          els.quietStart.value = state.prefs.quietHoursStart || '';
          els.quietEnd.value = state.prefs.quietHoursEnd || '';
          els.natLang.checked = Boolean(state.prefs.naturalLanguageEnabled);
          els.quietEnabled.checked = Boolean(state.prefs.quietHoursEnabled);
        }

        function updateCounts(reminders) {
          const upcoming = reminders.filter((item) => item.status === 'pending' && item.kind !== 'advance' && new Date(item.runAt).getTime() >= Date.now()).length;
          const recurring = reminders.filter((item) => String(item.recurrenceType || 'none') !== 'none').length;
          const past = reminders.filter((item) => ['sent', 'completed', 'deleted'].includes(String(item.status || ''))).length;
          document.getElementById('remStatUpcoming').textContent = String(upcoming);
          document.getElementById('remStatRecurring').textContent = String(recurring);
          document.getElementById('remStatPast').textContent = String(past);
        }

        function renderReminders(reminders, prefs) {
          updateCounts(reminders);
          if (!reminders.length) {
            els.reminderList.innerHTML = '<div class="muted-box">No reminders found for this view.</div>';
            return;
          }
          els.reminderList.innerHTML = reminders.map((reminder) => {
            const checked = state.selectedIds && state.selectedIds.has(reminder._id) ? 'checked' : '';
            const status = reminder.status || 'pending';
            const badge = reminderBadge(reminder);
            return '<div class="reminder-card panel">' +
              '<div class="inline-copy">' +
                '<label class="switch"><input type="checkbox" data-reminder-select="' + reminder._id + '" ' + checked + ' /> <span class="switch-label">Select</span></label>' +
                '<div class="chip">' + status + '</div>' +
              '</div>' +
              '<div class="target-title">' + (reminder.message || 'Untitled reminder') + '</div>' +
              '<div class="target-meta">' + reminder.chatJid + '<br />' + formatReminderTime(reminder.runAt, prefs) + '<br />' + badge + '</div>' +
              '<div class="toolbar">' +
                '<button class="ghost-btn tiny-btn" type="button" data-edit-reminder="' + reminder._id + '">Edit</button>' +
                '<button class="ghost-btn tiny-btn" type="button" data-snooze-reminder="' + reminder._id + '" data-snooze="5">Snooze 5</button>' +
                '<button class="ghost-btn tiny-btn" type="button" data-snooze-reminder="' + reminder._id + '" data-snooze="15">Snooze 15</button>' +
                '<button class="ghost-btn tiny-btn" type="button" data-snooze-reminder="' + reminder._id + '" data-snooze="60">Snooze 60</button>' +
                '<button class="ghost-btn tiny-btn" type="button" data-complete-reminder="' + reminder._id + '">Complete</button>' +
                '<button class="ghost-btn danger-btn tiny-btn" type="button" data-delete-reminder="' + reminder._id + '">Delete</button>' +
              '</div>' +
            '</div>';
          }).join('');

          els.reminderList.querySelectorAll('[data-edit-reminder]').forEach((button) => {
            if (button.dataset.bound === '1') return;
            button.dataset.bound = '1';
            button.addEventListener('click', async () => {
              const id = button.getAttribute('data-edit-reminder');
              const found = reminders.find((item) => item._id === id);
              if (!found) return;
              fillForm(found);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            });
          });

          els.reminderList.querySelectorAll('[data-snooze-reminder]').forEach((button) => {
            if (button.dataset.bound === '1') return;
            button.dataset.bound = '1';
            button.addEventListener('click', async () => {
              const id = button.getAttribute('data-snooze-reminder');
              const minutes = Number(button.getAttribute('data-snooze') || '5');
              await Dashboard.reminderAction(id, 'snooze', { snoozeMinutes: minutes });
              await reloadView();
            });
          });

          els.reminderList.querySelectorAll('[data-complete-reminder]').forEach((button) => {
            if (button.dataset.bound === '1') return;
            button.dataset.bound = '1';
            button.addEventListener('click', async () => {
              const id = button.getAttribute('data-complete-reminder');
              await Dashboard.reminderAction(id, 'complete');
              await reloadView();
            });
          });

          els.reminderList.querySelectorAll('[data-delete-reminder]').forEach((button) => {
            if (button.dataset.bound === '1') return;
            button.dataset.bound = '1';
            button.addEventListener('click', async () => {
              const id = button.getAttribute('data-delete-reminder');
              if (!window.confirm('Delete this reminder?')) return;
              await Dashboard.deleteReminder(id);
              await reloadView();
            });
          });

          els.reminderList.querySelectorAll('[data-reminder-select]').forEach((input) => {
            if (input.dataset.bound === '1') return;
            input.dataset.bound = '1';
            input.addEventListener('change', () => {
              state.selectedIds = state.selectedIds || new Set();
              const id = input.getAttribute('data-reminder-select');
              if (input.checked) state.selectedIds.add(id);
              else state.selectedIds.delete(id);
            });
          });
        }

        async function reloadView() {
          const response = await Dashboard.listReminders(state.view);
          state.reminders = response.reminders || [];
          state.prefs = response.prefs || state.prefs || {};
          renderReminders(state.reminders, state.prefs);
        }

        async function savePrefs() {
          const prefs = readPrefs();
          await Dashboard.saveReminderPrefs(prefs);
          state.prefs = prefs;
          setPrefStatus('Preferences saved.');
        }

        async function saveReminder() {
          const values = readForm();
          if (!values.target) {
            setStatus('Target is required.');
            return;
          }
          if (!values.message && !values.text) {
            setStatus('Add a reminder message or natural language text.');
            return;
          }
          let payload = {
            target: values.target,
            targetType: values.targetType,
            message: values.message,
            date: values.date,
            time: values.time,
            text: values.text,
            naturalLanguageEnabled: values.naturalLanguageEnabled,
            recurrenceType: values.recurrenceType,
            recurrenceInterval: values.recurrenceInterval,
            recurrenceWeekday: values.recurrenceWeekday,
            recurrenceOrdinal: values.recurrenceOrdinal,
            advanceMinutes: values.advanceMinutes,
            snoozeMinutes: values.snoozeMinutes,
            mentionMode: values.mentionMode,
            mentionJids: values.mentionJids,
            ackAction: values.ackAction,
            tagAll: values.tagAll,
            quietHoursEnabled: values.quietHoursEnabled,
            timezone: state.prefs.timezone || 'Africa/Lagos',
            defaultTime: state.prefs.defaultTime || '09:00',
            timeFormat: state.prefs.timeFormat || '24h',
            dateFormat: state.prefs.dateFormat || 'DD/MM/YYYY',
            quietHoursStart: state.prefs.quietHoursStart || '',
            quietHoursEnd: state.prefs.quietHoursEnd || '',
            quietHoursTimezone: state.prefs.quietHoursTimezone || state.prefs.timezone || 'Africa/Lagos',
            naturalLanguageEnabled: Boolean(values.naturalLanguageEnabled || state.prefs.naturalLanguageEnabled),
          };
          if (state.editingId) {
            await Dashboard.updateReminder(state.editingId, payload);
            setStatus('Reminder updated.');
          } else {
            await Dashboard.createReminder(payload);
            setStatus('Reminder created.');
          }
          state.editingId = '';
          els.saveReminderBtn.textContent = 'Save reminder';
          await reloadView();
        }

        function resetForm() {
          state.editingId = '';
          els.remTarget.value = '';
          els.remNaturalText.value = '';
          els.remUseNatLang.checked = false;
          els.remDate.value = '';
          els.remTime.value = '';
          els.remMessage.value = '';
          els.remRecurrence.value = 'none';
          els.remInterval.value = 1;
          els.remWeekday.value = '';
          els.remOrdinal.value = '';
          els.remAdvanceMinutes.value = 0;
          els.remSnoozeMinutes.value = 15;
          els.remMentionMode.value = 'none';
          els.remMentionJids.value = '';
          els.remAckAction.value = 'keep';
          els.remTagAll.checked = false;
          els.remQuietEnabled.checked = false;
          els.saveReminderBtn.textContent = 'Save reminder';
          setStatus('Form reset.');
        }

        if (els.savePrefBtn && !els.savePrefBtn.dataset.bound) {
          els.savePrefBtn.dataset.bound = '1';
          els.savePrefBtn.addEventListener('click', () => savePrefs().catch((err) => setPrefStatus(err.message)));
        }

        if (els.saveReminderBtn && !els.saveReminderBtn.dataset.bound) {
          els.saveReminderBtn.dataset.bound = '1';
          els.saveReminderBtn.addEventListener('click', () => saveReminder().catch((err) => setStatus(err.message)));
        }

        if (els.resetReminderBtn && !els.resetReminderBtn.dataset.bound) {
          els.resetReminderBtn.dataset.bound = '1';
          els.resetReminderBtn.addEventListener('click', resetForm);
        }

        if (els.parseBtn && !els.parseBtn.dataset.bound) {
          els.parseBtn.dataset.bound = '1';
          els.parseBtn.addEventListener('click', async () => {
            const text = (els.remNaturalText.value || '').trim();
            if (!text) return setStatus('Type some natural language first.');
            const parsed = await Dashboard.parseReminderText(text);
            const runAt = new Date(parsed.parsed.runAt);
            els.remDate.value = runAt.toISOString().slice(0, 10);
            els.remTime.value = runAt.toISOString().slice(11, 16);
            els.remMessage.value = parsed.parsed.message || els.remMessage.value;
            setStatus('Text parsed and fields filled.');
          });
        }

        if (els.bulkDeleteBtn && !els.bulkDeleteBtn.dataset.bound) {
          els.bulkDeleteBtn.dataset.bound = '1';
          els.bulkDeleteBtn.addEventListener('click', async () => {
            const ids = Array.from(state.selectedIds || []);
            if (!ids.length) return setStatus('Select reminders first.');
            if (!window.confirm('Delete ' + ids.length + ' reminders?')) return;
            for (const id of ids) {
              await Dashboard.deleteReminder(id);
            }
            state.selectedIds = new Set();
            await reloadView();
          });
        }

        if (els.bulkCompleteBtn && !els.bulkCompleteBtn.dataset.bound) {
          els.bulkCompleteBtn.dataset.bound = '1';
          els.bulkCompleteBtn.addEventListener('click', async () => {
            const ids = Array.from(state.selectedIds || []);
            if (!ids.length) return setStatus('Select reminders first.');
            for (const id of ids) {
              await Dashboard.reminderAction(id, 'complete');
            }
            state.selectedIds = new Set();
            await reloadView();
          });
        }

        document.querySelectorAll('[data-view-btn]').forEach((button) => {
          if (button.dataset.bound === '1') return;
          button.dataset.bound = '1';
          button.addEventListener('click', async () => {
            state.view = button.getAttribute('data-view-btn');
            await reloadView();
          });
        });

        await loadPrefs();
        await reloadView();
      })();
    `
  });
}

function pairingPage(activeTarget) {
  return pageShell({
    active: '/pairing',
    title: 'Pairing',
    subtitle: 'Generate codes and manage paired sessions.',
    boot: { defaultTarget: activeTarget || 'bot' },
    body: `
      <div class="page-shell">
        <div class="pairs-shell">
          <div class="panel section">
            <div class="pair-head">
              <h2 class="section-title">Generate Pairing Code</h2>
              <p class="section-desc">Enter a WhatsApp number to generate a code.</p>
              <div class="pair-action">
                <input class="field" id="pairNumber" placeholder="234xxxxxxxx" />
                <button class="primary-btn" id="pairBtn" type="button">Generate code</button>
              </div>
              <div class="muted-box">
                <div class="inline-copy">
                  <span>Latest code: <strong id="pairCode">Not generated yet</strong></span>
                  <button class="ghost-btn" type="button" id="pairCodeCopy">Copy</button>
                </div>
                Status: <span id="pairStatus">Waiting for input</span>
              </div>
            </div>
          </div>
          <div class="panel section">
            <h2 class="section-title">Pairing Summary</h2>
            <div class="pair-stats">
              <div class="panel stat">
                <div class="stat-label">Paired sessions</div>
                <div class="stat-value" id="summaryPairs">0</div>
              </div>
              <div class="panel stat">
                <div class="stat-label">Tracked groups</div>
                <div class="stat-value" id="summaryGroups">0</div>
              </div>
              <div class="panel stat">
                <div class="stat-label">Tracked chats</div>
                <div class="stat-value" id="summaryChats">0</div>
              </div>
            </div>
            <div class="muted-box">Uses the existing pairing folder.</div>
          </div>
        </div>

        <div class="panel section">
          <h2 class="section-title">Pairing Status</h2>
          <p class="section-desc">Live status updates appear here.</p>
          <div class="grid-4">
          <div class="panel stat"><div class="stat-label">Status</div><div class="stat-value" id="pairState">Idle</div></div>
            <div class="panel stat"><div class="stat-label">Code</div><div class="stat-value inline-copy-value"><span id="pairStateCode">-</span><button class="ghost-btn tiny-btn" type="button" id="pairStateCodeCopy">Copy</button></div></div>
            <div class="panel stat"><div class="stat-label">Target</div><div class="stat-value inline-copy-value"><span id="pairStateTarget">-</span><button class="ghost-btn tiny-btn" type="button" id="pairStateTargetCopy">Copy</button></div></div>
            <div class="panel stat"><div class="stat-label">Last connected</div><div class="stat-value" id="pairStateTime">-</div></div>
          </div>
          <div class="muted-box" id="pairStateNote">Waiting for a pairing request.</div>
        </div>

        <div class="panel section">
          <h2 class="section-title">Paired Sessions</h2>
          <p class="section-desc">Paired sessions list.</p>
          <div id="pairList" class="pair-list"></div>
        </div>
      </div>
    `,
    script: `
      async function refreshPairsPage() {
        try {
          const data = await Dashboard.loadState();
          Dashboard.renderPairs(data.pairs);
        } catch {
          const list = document.getElementById('pairList');
          if (list) list.innerHTML = '<div class="muted-box">Pair the WhatsApp session first to load dashboard data.</div>';
        }
      }
      window.refreshPairsPage = refreshPairsPage;
      let pairPollTimer = null;
      async function updatePairStatus(target) {
        if (!target) return;
        const status = await Dashboard.getPairStatus(target);
        const pairState = document.getElementById('pairState');
        const pairStateCode = document.getElementById('pairStateCode');
        const pairStateTarget = document.getElementById('pairStateTarget');
        const pairStateTime = document.getElementById('pairStateTime');
        const pairStateNote = document.getElementById('pairStateNote');
        if (pairState) pairState.textContent = status.status || 'unknown';
        if (pairStateCode) pairStateCode.textContent = status.pairingCode || '-';
        if (pairStateTarget) pairStateTarget.textContent = status.target || target;
        if (pairStateTime) pairStateTime.textContent = status.lastConnectedAt ? new Date(status.lastConnectedAt).toLocaleString() : '-';
        if (pairStateNote) {
          pairStateNote.textContent =
            status.status === 'active'
              ? 'Pairing is complete and the session is live on the website and in MongoDB Atlas.'
              : status.status === 'pairing'
                ? 'Pairing code generated. Finish linking in WhatsApp.'
                : status.status === 'disconnected'
                  ? 'The session disconnected and may need to be re-paired.'
                  : 'Waiting for the next update.';
        }
        return status;
      }
      const pairBtn = document.getElementById('pairBtn');
      const pairNumber = document.getElementById('pairNumber');
      const pairCode = document.getElementById('pairCode');
      const pairStatus = document.getElementById('pairStatus');
      const pairCodeCopy = document.getElementById('pairCodeCopy');
      const pairStateCodeCopy = document.getElementById('pairStateCodeCopy');
      const pairStateTargetCopy = document.getElementById('pairStateTargetCopy');
      if (pairCodeCopy && !pairCodeCopy.dataset.bound) {
        pairCodeCopy.dataset.bound = '1';
        pairCodeCopy.addEventListener('click', async () => {
          const text = (pairCode.textContent || '').trim();
          if (!text || text === 'Not generated yet' || text === 'Waiting...' || text === 'Waiting for code...') return;
          await navigator.clipboard.writeText(text).catch(() => {});
          pairStatus.textContent = 'Pairing code copied.';
        });
      }
      if (pairStateCodeCopy && !pairStateCodeCopy.dataset.bound) {
        pairStateCodeCopy.dataset.bound = '1';
        pairStateCodeCopy.addEventListener('click', async () => {
          const text = (document.getElementById('pairStateCode')?.textContent || '').trim();
          if (!text || text === '-') return;
          await navigator.clipboard.writeText(text).catch(() => {});
          pairStatus.textContent = 'Pairing code copied.';
        });
      }
      if (pairStateTargetCopy && !pairStateTargetCopy.dataset.bound) {
        pairStateTargetCopy.dataset.bound = '1';
        pairStateTargetCopy.addEventListener('click', async () => {
          const text = (document.getElementById('pairStateTarget')?.textContent || '').trim();
          if (!text || text === '-') return;
          await navigator.clipboard.writeText(text).catch(() => {});
          pairStatus.textContent = 'Target copied.';
        });
      }
      if (pairBtn && !pairBtn.dataset.bound) {
        pairBtn.dataset.bound = '1';
        pairBtn.addEventListener('click', async () => {
          pairBtn.disabled = true;
          pairStatus.textContent = 'Requesting pairing code...';
          pairCode.textContent = 'Waiting...';
          if (document.getElementById('pairState')) document.getElementById('pairState').textContent = 'requesting';
          if (document.getElementById('pairStateCode')) document.getElementById('pairStateCode').textContent = '-';
          if (document.getElementById('pairStateTarget')) document.getElementById('pairStateTarget').textContent = pairNumber.value || '-';
          if (document.getElementById('pairStateTime')) document.getElementById('pairStateTime').textContent = '-';
          if (document.getElementById('pairStateNote')) document.getElementById('pairStateNote').textContent = 'Pairing request sent. Waiting for the code to be saved in MongoDB Atlas.';
          try {
            const data = await Dashboard.postPair(pairNumber.value);
            pairCode.textContent = data.code || 'Waiting for code...';
            pairStatus.textContent = data.alreadyPaired ? 'This account is already paired.' : 'Pairing request sent';
            Dashboard.showToast('Pairing code generated');
            await refreshPairsPage();
            if (pairPollTimer) clearInterval(pairPollTimer);
            if (data.target) {
              const firstState = await updatePairStatus(data.target).catch((err) => {
                pairStatus.textContent = err.message;
                return null;
              });
              if (firstState && firstState.status === 'pairing' && !firstState.pairingCode) {
                pairStatus.textContent = 'Pairing request saved. Waiting for code...';
                pairCode.textContent = 'Waiting for code...';
              }
              let tries = 0;
              pairPollTimer = setInterval(async () => {
                tries += 1;
                try {
                  const state = await updatePairStatus(data.target);
                  if (state.status === 'active') {
                    pairStatus.textContent = 'Pairing confirmed on the website.';
                    pairCode.textContent = state.pairingCode || pairCode.textContent;
                    Dashboard.showToast('Pairing confirmed');
                    clearInterval(pairPollTimer);
                    pairPollTimer = null;
                  } else if (state.status === 'pairing' && state.pairingCode) {
                    pairStatus.textContent = 'Pairing code is ready.';
                    pairCode.textContent = state.pairingCode;
                  }
                  if (tries >= 20) {
                    clearInterval(pairPollTimer);
                    pairPollTimer = null;
                    if (!pairCode.textContent || pairCode.textContent === 'Waiting for code...') {
                      pairStatus.textContent = 'Pairing is still being prepared. Please try again in a moment.';
                    }
                  }
                } catch (err) {
                  pairStatus.textContent = err.message;
                  clearInterval(pairPollTimer);
                  pairPollTimer = null;
                }
              }, 3000);
            }
          } catch (err) {
            pairStatus.textContent = err.message;
          } finally {
            pairBtn.disabled = false;
          }
        });
      }
      (async () => {
        await refreshPairsPage();
      })();
    `
  });
}

async function renderPage(req, url) {
  const target = url.searchParams.get('target') || 'bot';
  const pathname = String(url.pathname || '/').replace(/\/+$/, '') || '/';
  const pairedSessionId = await getDashboardProfileSessionId(req).catch(() => '');
  const accountId = await getDashboardAccountId(req).catch(() => '');
  const scopeSessionId = await getDashboardScopeSessionId(req).catch(() => '');
  if (pathname === '/') return homePage(scopeSessionId);
  if (pathname === '/accounts' || pathname.startsWith('/accounts/')) return accountsPage(accountId, pairedSessionId);
  if (pathname === '/commands' || pathname.startsWith('/commands/')) {
    const active = url.searchParams.get('target') || pairedSessionId;
    if (!active) return accountsPage(accountId, pairedSessionId);
    return commandPage(active, true);
  }
  if (pathname === '/groups/view' || pathname.startsWith('/groups/view/')) return groupDetailPage(url.searchParams.get('target') || pairedSessionId || target);
  if (pathname === '/groups' || pathname.startsWith('/groups/')) {
    const active = url.searchParams.get('target') || pairedSessionId || target;
    if (!active || active === 'bot') return accountsPage(accountId, pairedSessionId);
    return groupsPage(active);
  }
  if (pathname === '/chats/view' || pathname.startsWith('/chats/view/')) return chatDetailPage(url.searchParams.get('target') || pairedSessionId || target);
  if (pathname === '/business' || pathname.startsWith('/business/')) {
    const active = url.searchParams.get('target') || pairedSessionId || target;
    if (!active || active === 'bot') return accountsPage(accountId, pairedSessionId);
    return businessPage(active);
  }
  if (pathname === '/chats' || pathname.startsWith('/chats/')) return chatsPage();
  if (pathname === '/reminders' || pathname.startsWith('/reminders/')) return remindersPage(url.searchParams.get('target') || pairedSessionId || target);
  if (pathname === '/pairing' || pathname.startsWith('/pairing/')) return pairingPage(target);
  return null;
}

module.exports = {
  PORT,
  COOKIE_NAME,
  OWNER_COOKIE_NAME,
  parseCookies,
  escapeHtml,
  navMarkup,
  controlCard,
  guideCard,
  targetCard,
  pageShell,
  loginPage,
  ownerLoginPage,
  ownerStats,
  ownerDashboardPage,
  homePage,
  commandPage,
  groupsPage,
  businessPage,
  chatsPage,
  groupDetailPage,
  chatDetailPage,
  remindersPage,
  pairingPage,
  renderPage,
  sendJson,
  readBody,
  isAuthed,
  isOwnerAuthed,
  isDashboardAuthed,
  getDashboardProfileSessionId,
  getDashboardAccountId,
  getDashboardScopeSessionId,
  readSettingsSnapshot,
  listPairs,
  refreshPairCache,
  getTargetMeta,
  listTargets,
  getTargetKind,
  controlValue,
  buildState,
  CONTROL_CATALOG,
  COMMAND_GUIDES,
  moduleMain: () => require('./web/router').start(),
};

if (require.main === module) {
  module.exports.moduleMain();
}