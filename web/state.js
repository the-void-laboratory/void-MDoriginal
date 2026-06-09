const fs = require('fs');
const path = require('path');
const { getSetting, initSettings } = require('../Settings');
const {
  loadSessionIds,
  getSessionFolder,
} = require('../database/mongo');
const { readJsonSafe } = require('./helpers');

const SETTINGS_PATH = path.join(__dirname, '..', 'setting.json');
let pairCache = [];

function readSettingsSnapshot() {
  return readJsonSafe(SETTINGS_PATH, {});
}

function listPairs(scopeSessionId = '') {
  return pairCache.filter((sessionId) => {
    if (!scopeSessionId) return true;
    return sessionId === scopeSessionId;
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

function getTargetMeta(settings = {}) {
  const meta = settings.__meta || {};
  return {
    name: meta.name || '',
    kind: meta.kind || '',
  };
}

function listTargets(scopeSessionId = '') {
  const snapshot = readSettingsSnapshot();
  return Object.entries(snapshot)
    .filter(([jid]) => jid !== 'bot')
    .map(([jid, settings]) => {
      const meta = getTargetMeta(settings);
      const kind = meta.kind || (jid.endsWith('@g.us') ? 'group' : 'chat');
      const keys = Object.keys(settings || {}).filter((key) => key !== '__meta');
      const active = keys.filter((key) => Boolean(settings[key])).length;
      const ownerSessionId = settings.__ownerSessionId || '';
      if (scopeSessionId && ownerSessionId && ownerSessionId !== scopeSessionId) {
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

function buildState(target, scopeSessionId = '') {
  const { CONTROL_CATALOG } = require('./constants');
  const state = {};
  CONTROL_CATALOG.filter((item) => item.page === 'commands').forEach((item) => {
    state[item.key] = controlValue(target, item.key);
  });

  const controls = CONTROL_CATALOG.filter((item) => item.page !== 'commands');
  controls.forEach((item) => {
    state[item.key] = controlValue(target, item.key);
  });

  const pairs = listPairs(scopeSessionId);
  const targets = listTargets(scopeSessionId);
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

module.exports = {
  readSettingsSnapshot,
  listPairs,
  refreshPairCache,
  getTargetMeta,
  listTargets,
  getTargetKind,
  controlValue,
  buildState,
};
