const fs = require('fs');
const { NAV } = require('./constants');

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8') || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function navMarkup(active) {
  return NAV.map((item) => {
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

module.exports = { readJsonSafe, parseCookies, escapeHtml, navMarkup, controlCard, guideCard, targetCard };
