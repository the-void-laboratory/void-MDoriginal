const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const { getSetting, setSetting } = require('../Settings');
const { rentbotTracker } = require('../pair');
const { COMMAND_INDEX, COMMAND_CATEGORIES } = require('./command-catalog');
const templates = require('./templates');
const {
  createWebSession,
  destroyWebSession,
  attachWebSessionPair,
  detachWebSessionPair,
  getWebSessionByToken,
  loadSessionIds,
  getSessionDoc,
  getSessionFolder,
  deleteSessionArtifacts,
  upsertReminder,
  createReminderBundle,
  listReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  deleteReminderChildren,
  completeReminder,
  snoozeReminder,
  getAccountReminderPrefs,
  updateAccountReminderPrefs,
  createAccount,
  authenticateAccount,
  setAccountLinkedSession,
} = require('../database/mongo');
const web = require('../web.js');
const startpairing = require('../pair');
const {
  normalizeTimezone,
  parseNaturalLanguageReminder,
  computeNextRecurrence,
  isInQuietHours,
  getReminderMentionTargets,
  buildReminderDeliveryText,
} = require('./reminder-utils');

const OWNER_WEB_PASSWORD = process.env.OWNER_WEB_PASSWORD || process.env.OWNER_PASSWORD || '';
const sessions = new Set();
const ownerSessions = new Set();
const PORT = web.PORT;

function normalizeTargetJid(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (value.includes('@')) return value;
  const digits = value.replace(/\D/g, '');
  if (!digits) return value;
  return `${digits}@s.whatsapp.net`;
}

async function getReminderSessionId(req) {
  const selectedSessionId = await web.getDashboardScopeSessionId(req).catch(() => '');
  if (selectedSessionId) return selectedSessionId;
  const cookies = web.parseCookies(req.headers.cookie || '');
  const token = cookies[web.COOKIE_NAME];
  const webSession = token ? await getWebSessionByToken(token).catch(() => null) : null;
  if (webSession?.pairedSessionId) return webSession.pairedSessionId;
  const accountId = await getReminderAccountId(req);
  if (accountId) {
    const activeSessions = await loadSessionIds({ status: 'active', accountId }).catch(() => []);
    return activeSessions[0] || '';
  }
  return '';
}

async function getReminderAccountId(req) {
  return web.getDashboardAccountId(req).catch(() => '');
}

function parseMentionTargets(raw = '') {
  return String(raw || '')
    .split(/[\n,]/)
    .map((item) => normalizeTargetJid(item))
    .filter(Boolean);
}

async function syncReminderAdvanceChild(reminderId) {
  const reminder = await getReminderById(reminderId).catch(() => null);
  if (!reminder) return;
  await deleteReminderChildren(reminderId).catch(() => {});
  if (reminder.status !== 'pending' || !reminder.advanceMinutes || !reminder.runAt) return;
  const advanceRunAt = new Date(new Date(reminder.runAt).getTime() - Number(reminder.advanceMinutes || 0) * 60 * 1000);
  if (advanceRunAt.getTime() <= Date.now()) return;
  await upsertReminder({
    sessionId: reminder.sessionId,
    accountId: reminder.accountId,
    chatJid: reminder.chatJid,
    targetType: reminder.targetType,
    message: reminder.message,
    runAt: advanceRunAt,
    timezone: reminder.timezone,
    defaultTime: reminder.defaultTime,
    timeFormat: reminder.timeFormat,
    dateFormat: reminder.dateFormat,
    naturalLanguageEnabled: reminder.naturalLanguageEnabled,
    sourceText: reminder.sourceText,
    kind: 'advance',
    parentReminderId: String(reminder._id),
    tagAll: reminder.tagAll,
    mentionMode: reminder.mentionMode,
    mentionJids: reminder.mentionJids || [],
    recurrenceType: 'none',
    recurrenceInterval: 1,
    recurrencePattern: '',
    recurrenceWeekday: null,
    recurrenceOrdinal: null,
    recurrenceUnit: 'minute',
    advanceMinutes: 0,
    quietHoursEnabled: reminder.quietHoursEnabled,
    quietHoursStart: reminder.quietHoursStart,
    quietHoursEnd: reminder.quietHoursEnd,
    quietHoursTimezone: reminder.quietHoursTimezone,
    snoozeMinutes: reminder.snoozeMinutes,
    ackAction: 'keep',
    status: 'pending',
  });
}

async function start() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    try {
      if (req.method === 'GET' && url.pathname === '/api/command/info') {
        const slug = url.searchParams.get('slug');
        return web.sendJson(res, 200, COMMAND_INDEX[slug] || { error: 'Not found' });
      }

      if (req.method === 'POST' && url.pathname === '/api/command/execute') {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const body = await web.readBody(req);
        const { slug, target, inputs } = body;
        const cmd = COMMAND_INDEX[slug];
        if (!cmd) return web.sendJson(res, 400, { error: 'Invalid command' });

        const tracker = rentbotTracker.get(target);
        if (!tracker || !tracker.connection) return web.sendJson(res, 400, { error: 'Session not active' });

        let text = `.${cmd.name}`;
        if (cmd.fields) {
          cmd.fields.forEach(f => {
            if (inputs[f.name]) text += (f.separator || ' ') + inputs[f.name];
          });
        }

        await tracker.connection.sendMessage(target, { text });
        return web.sendJson(res, 200, { ok: true });
      }

      if (req.method === 'GET' && url.pathname === '/commands') {
        const target = url.searchParams.get('target') || await web.getDashboardProfileSessionId(req);
        return res.end(templates.commandPage(target || 'bot', COMMAND_CATEGORIES));
      }

      if (req.method === 'GET' && url.pathname === '/api/command/info') {
        const slug = url.searchParams.get('slug');
        const cmd = COMMAND_INDEX[slug];
        return web.sendJson(res, 200, cmd || { error: 'Not found' });
      }

      if (req.method === 'POST' && url.pathname === '/api/command/execute') {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const body = await web.readBody(req);
        const { slug, target, inputs } = body;
        const cmd = COMMAND_INDEX[slug];
        if (!cmd) return web.sendJson(res, 400, { error: 'Invalid command' });

        const tracker = rentbotTracker.get(target);
        if (!tracker || !tracker.connection) return web.sendJson(res, 400, { error: 'Session not active' });

        let text = `.${cmd.name}`;
        if (cmd.fields) {
          cmd.fields.forEach(f => {
            if (inputs[f.name]) text += ` ${inputs[f.name]}`;
          });
        }

        await tracker.connection.sendMessage(target, { text });
        return web.sendJson(res, 200, { ok: true });
      }

      if (req.method === 'GET' && url.pathname === '/commands') {
        const scopeSessionId = await web.getDashboardScopeSessionId(req);
        return res.end(templates.commandPage(scopeSessionId || 'bot', COMMAND_CATEGORIES));
      }

      if (req.method === 'GET' && url.pathname === '/') {
        return res.end(templates.homePage());
      }

      if (req.method === 'GET' && url.pathname === '/owner/owner') {
        res.writeHead(302, {
          Location: '/owner',
          'Cache-Control': 'no-store',
        });
        return res.end();
      }

      if (req.method === 'GET' && (url.pathname === '/owner' || url.pathname === '/owner/login')) {
        if (await isOwnerAuthed(req)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          return res.end(web.ownerDashboardPage());
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(web.ownerLoginPage());
      }

      if (req.method === 'POST' && url.pathname === '/api/owner/login') {
        if (!OWNER_WEB_PASSWORD) {
          return web.sendJson(res, 500, { error: 'Owner password is not configured' });
        }
        const body = await web.readBody(req);
        if (body.password !== OWNER_WEB_PASSWORD) {
          return web.sendJson(res, 401, { error: 'Incorrect owner password' });
        }
        const token = `owner-${crypto.randomBytes(24).toString('hex')}`;
        ownerSessions.add(token);
        await createWebSession(token, {
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: req.headers['user-agent'] || '',
        });
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Set-Cookie': `${web.OWNER_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`
        });
        return res.end(JSON.stringify({ ok: true }));
      }

      if (req.method === 'POST' && url.pathname === '/api/owner/logout') {
        const cookies = web.parseCookies(req.headers.cookie || '');
        const ownerCookieName = web.OWNER_COOKIE_NAME;
        if (cookies[ownerCookieName]) {
          ownerSessions.delete(cookies[ownerCookieName]);
          await destroyWebSession(cookies[ownerCookieName]).catch(() => {});
        }
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Set-Cookie': `${ownerCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
        });
        return res.end(JSON.stringify({ ok: true }));
      }

      if (req.method === 'GET' && url.pathname === '/api/owner/state') {
        if (!(await isOwnerAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        return web.sendJson(res, 200, web.ownerStats());
      }

      if (req.method === 'GET' && url.pathname === '/api/account/sessions') {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const accountId = await web.getDashboardAccountId(req).catch(() => '');
        if (!accountId) return web.sendJson(res, 400, { error: 'No account selected' });
        const sessionIds = await loadSessionIds({ status: 'active', accountId }).catch(() => []);
        const sessionsList = await Promise.all(
          sessionIds.map(async (sessionId) => {
            const doc = await getSessionDoc(sessionId).catch(() => null);
            return doc ? {
              sessionId: doc.sessionId,
              name: doc.jid || doc.number || doc.sessionId,
              jid: doc.jid || '',
              number: doc.number || '',
              status: doc.status || 'unknown',
              updatedAt: doc.updatedAt || null,
              lastConnectedAt: doc.lastConnectedAt || null,
            } : null;
          })
        );
        return web.sendJson(res, 200, { sessions: sessionsList.filter(Boolean) });
      }

      if (req.method === 'POST' && url.pathname === '/api/account/select') {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const body = await web.readBody(req);
        const sessionId = String(body.sessionId || '').trim();
        if (!sessionId) return web.sendJson(res, 400, { error: 'Missing sessionId' });
        const accountId = await web.getDashboardAccountId(req).catch(() => '');
        if (!accountId) return web.sendJson(res, 400, { error: 'No account selected' });
        const sessionDoc = await getSessionDoc(sessionId).catch(() => null);
        if (!sessionDoc || sessionDoc.accountId !== accountId) {
          return web.sendJson(res, 403, { error: 'That WhatsApp session does not belong to this account' });
        }
        const cookies = web.parseCookies(req.headers.cookie || '');
        const cookieName = web.COOKIE_NAME;
        if (cookies[cookieName]) {
          await attachWebSessionPair(cookies[cookieName], sessionId).catch(() => {});
        }
        await setAccountLinkedSession(accountId, sessionId).catch(() => {});
        return web.sendJson(res, 200, { ok: true, sessionId });
      }

      if (req.method === 'POST' && url.pathname === '/api/signup') {
        const body = await web.readBody(req);
        const email = String(body.email || '').trim();
        const password = String(body.password || '').trim();
        const accessCode = String(body.accessCode || '').trim();
        if (!email || !password || !accessCode) {
          return web.sendJson(res, 400, { error: 'Email, password, and access code are required' });
        }
        const account = await createAccount({ email, password, accessCode });
        const token = crypto.randomBytes(24).toString('hex');
        sessions.add(token);
        await createWebSession(token, {
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: req.headers['user-agent'] || '',
          accountId: account.accountId,
          pairedSessionId: account.linkedSessionId || '',
        });
        if (account.linkedSessionId) {
          await setAccountLinkedSession(account.accountId, account.linkedSessionId).catch(() => {});
        }
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Set-Cookie': `${web.COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`
        });
        return res.end(JSON.stringify({ ok: true }));
      }

      if (req.method === 'POST' && url.pathname === '/api/login') {
        const body = await web.readBody(req);
        const email = String(body.email || '').trim();
        const password = String(body.password || '').trim();
        const accessCode = String(body.accessCode || '').trim();
        if (!email || !password || !accessCode) {
          return web.sendJson(res, 400, { error: 'Email, password, and access code are required' });
        }
        const account = await authenticateAccount(email, password, accessCode);
        if (!account) {
          return web.sendJson(res, 401, { error: 'Incorrect account credentials' });
        }
        const token = crypto.randomBytes(24).toString('hex');
        sessions.add(token);
        await createWebSession(token, {
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: req.headers['user-agent'] || '',
          accountId: account.accountId,
          pairedSessionId: account.linkedSessionId || '',
        });
        if (account.linkedSessionId) {
          await attachWebSessionPair(token, account.linkedSessionId).catch(() => {});
        }
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Set-Cookie': `${web.COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`
        });
        return res.end(JSON.stringify({ ok: true }));
      }

      if (req.method === 'POST' && url.pathname === '/api/logout') {
        const cookies = web.parseCookies(req.headers.cookie || '');
        const cookieName = web.COOKIE_NAME;
        if (cookies[cookieName]) {
          sessions.delete(cookies[cookieName]);
          await destroyWebSession(cookies[cookieName]).catch(() => {});
        }
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Set-Cookie': `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
        });
        return res.end(JSON.stringify({ ok: true }));
      }

      if (req.method === 'GET' && url.pathname === '/api/state') {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const target = url.searchParams.get('target') || 'bot';
        const scopeSessionId = await web.getDashboardScopeSessionId(req).catch(() => '');
        if (!scopeSessionId && !(await isOwnerAuthed(req))) {
          return web.sendJson(res, 409, { error: 'Pair a WhatsApp session first' });
        }
        if (scopeSessionId && target !== scopeSessionId && getSetting(target, '__ownerSessionId', '') !== scopeSessionId) {
          return web.sendJson(res, 403, { error: 'Forbidden' });
        }
        return web.sendJson(res, 200, web.buildState(target, scopeSessionId, await isOwnerAuthed(req)));
      }

      if (req.method === 'GET' && url.pathname === '/api/targets') {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const scopeSessionId = await web.getDashboardScopeSessionId(req).catch(() => '');
        if (!scopeSessionId && !(await isOwnerAuthed(req))) {
          return web.sendJson(res, 409, { error: 'Pair a WhatsApp session first' });
        }
        const targets = web.listTargets(scopeSessionId, await isOwnerAuthed(req));
        return web.sendJson(res, 200, {
          groups: targets.filter((entry) => entry.kind === 'group'),
          chats: targets.filter((entry) => entry.kind === 'chat'),
          pairs: web.listPairs(scopeSessionId, await isOwnerAuthed(req))
        });
      }

      if (req.method === 'GET' && url.pathname === '/api/pair/status') {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const target = url.searchParams.get('target');
        if (!target) return web.sendJson(res, 400, { error: 'Missing target' });
        const scopeSessionId = await web.getDashboardScopeSessionId(req).catch(() => '');
        if (!scopeSessionId && !(await isOwnerAuthed(req))) {
          return web.sendJson(res, 409, { error: 'Pair a WhatsApp session first' });
        }
        if (scopeSessionId && target !== scopeSessionId && getSetting(target, '__ownerSessionId', '') !== scopeSessionId) {
          return web.sendJson(res, 403, { error: 'Forbidden' });
        }
        const session = await getSessionDoc(target).catch(() => null);
        return web.sendJson(res, 200, {
          target,
          status: session?.status || 'missing',
          pairingCode: session?.pairingCode || '',
          lastConnectedAt: session?.lastConnectedAt || null,
        });
      }

      if (!(await isAuthed(req))) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(web.loginPage());
      }

      if (req.method === 'POST' && url.pathname === '/api/pair') {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const body = await web.readBody(req);
        const number = String(body.number || '').replace(/\D/g, '');
        if (!number) return web.sendJson(res, 400, { error: 'Enter a valid number' });
        const target = `${number}@s.whatsapp.net`;
        const cookies = web.parseCookies(req.headers.cookie || '');
        const cookieName = web.COOKIE_NAME;
        const currentWebSession = cookies[cookieName] ? await getWebSessionByToken(cookies[cookieName]).catch(() => null) : null;
        const existingSession = await getSessionDoc(target).catch(() => null);
        if (existingSession && existingSession.status !== 'deleted') {
          if (currentWebSession?.accountId) {
            await setAccountLinkedSession(currentWebSession.accountId, target).catch(() => {});
          }
          if (cookies[cookieName]) {
            await attachWebSessionPair(cookies[cookieName], target).catch(() => {});
          }
          await web.refreshPairCache();
          return web.sendJson(res, 200, {
            ok: true,
            alreadyPaired: true,
            status: existingSession.status,
            code: existingSession.pairingCode || '',
            target,
          });
        }
        if (cookies[cookieName]) {
          await attachWebSessionPair(cookies[cookieName], target).catch(() => {});
        }
        await startpairing(target);
        let pairingState = await getSessionDoc(target).catch(() => null);
        let tries = 0;
        while (tries < 12 && !pairingState?.pairingCode) {
          tries += 1;
          await new Promise((resolve) => setTimeout(resolve, 1000));
          pairingState = await getSessionDoc(target).catch(() => null);
        }
        if (currentWebSession?.accountId) {
          await setAccountLinkedSession(currentWebSession.accountId, target).catch(() => {});
        }
        await web.refreshPairCache();
        return web.sendJson(res, 200, {
          ok: true,
          code: pairingState?.pairingCode || '',
          status: pairingState?.status || 'pairing',
          target,
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/pairing/remove') {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const body = await web.readBody(req);
        const target = String(body.target || '').trim();
        if (!target) return web.sendJson(res, 400, { error: 'Missing target' });
        const scopeSessionId = await web.getDashboardScopeSessionId(req).catch(() => '');
        if (!scopeSessionId && !(await isOwnerAuthed(req))) {
          return web.sendJson(res, 409, { error: 'Pair a WhatsApp session first' });
        }
        if (scopeSessionId && target !== scopeSessionId && getSetting(target, '__ownerSessionId', '') !== scopeSessionId) {
          return web.sendJson(res, 403, { error: 'Forbidden' });
        }
        await deleteSessionArtifacts(target).catch(() => {});
        const localPath = getSessionFolder(target);
        fs.rmSync(localPath, { recursive: true, force: true });
        const cookies = web.parseCookies(req.headers.cookie || '');
        const cookieName = web.COOKIE_NAME;
        if (cookies[cookieName]) {
          const profileSessionId = await web.getDashboardProfileSessionId(req).catch(() => '');
          if (profileSessionId === target) {
            await detachWebSessionPair(cookies[cookieName]).catch(() => {});
          }
        }
        await web.refreshPairCache();
        return web.sendJson(res, 200, { ok: true, removed: target });
      }

      if (req.method === 'GET' && url.pathname === '/api/reminders/prefs') {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const accountId = await getReminderAccountId(req);
        if (!accountId) return web.sendJson(res, 400, { error: 'No account selected' });
        const prefs = await getAccountReminderPrefs(accountId).catch(() => ({}));
        return web.sendJson(res, 200, { prefs });
      }

      if (req.method === 'POST' && url.pathname === '/api/reminders/prefs') {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const accountId = await getReminderAccountId(req);
        if (!accountId) return web.sendJson(res, 400, { error: 'No account selected' });
        const body = await web.readBody(req);
        const current = await getAccountReminderPrefs(accountId).catch(() => ({}));
        const prefs = {
          ...current,
          ...(body.prefs || body || {}),
        };
        prefs.timezone = normalizeTimezone(prefs.timezone || current.timezone || 'Africa/Lagos');
        prefs.defaultTime = String(prefs.defaultTime || '09:00');
        prefs.timeFormat = String(prefs.timeFormat || '24h');
        prefs.dateFormat = String(prefs.dateFormat || 'DD/MM/YYYY');
        prefs.naturalLanguageEnabled = Boolean(prefs.naturalLanguageEnabled);
        prefs.advanceMinutes = Number(prefs.advanceMinutes || 0);
        prefs.quietHoursEnabled = Boolean(prefs.quietHoursEnabled);
        prefs.quietHoursStart = String(prefs.quietHoursStart || '');
        prefs.quietHoursEnd = String(prefs.quietHoursEnd || '');
        prefs.quietHoursTimezone = normalizeTimezone(prefs.quietHoursTimezone || prefs.timezone);
        prefs.mentionMode = String(prefs.mentionMode || 'none');
        prefs.mentionJids = Array.isArray(prefs.mentionJids) ? prefs.mentionJids.map((item) => normalizeTargetJid(item)).filter(Boolean) : [];
        prefs.defaultReminderType = String(prefs.defaultReminderType || 'manual');
        await updateAccountReminderPrefs(accountId, prefs);
        return web.sendJson(res, 200, { ok: true, prefs });
      }

      if (req.method === 'GET' && url.pathname === '/api/reminders') {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const sessionId = await getReminderSessionId(req);
        if (!sessionId && !(await isOwnerAuthed(req))) {
          return web.sendJson(res, 409, { error: 'Pair a WhatsApp session first' });
        }
        const view = String(url.searchParams.get('view') || 'upcoming').toLowerCase();
        const accountId = await getReminderAccountId(req);
        const reminders = await listReminders({ sessionId }).catch(() => []);
        const now = Date.now();
        const filtered = reminders.filter((reminder) => {
          const runAt = new Date(reminder.runAt).getTime();
          if (view === 'upcoming') return reminder.status === 'pending' && runAt >= now;
          if (view === 'past') return ['sent', 'completed', 'deleted'].includes(String(reminder.status || ''));
          if (view === 'recurring') return String(reminder.recurrenceType || 'none') !== 'none';
          return true;
        });
        const prefs = accountId ? await getAccountReminderPrefs(accountId).catch(() => ({})) : {};
        return web.sendJson(res, 200, { reminders: filtered, prefs, view });
      }

      if (req.method === 'POST' && url.pathname === '/api/reminders/parse') {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const accountId = await getReminderAccountId(req);
        if (!accountId) return web.sendJson(res, 400, { error: 'No account selected' });
        const body = await web.readBody(req);
        const text = String(body.text || '').trim();
        if (!text) return web.sendJson(res, 400, { error: 'Missing text' });
        const prefs = await getAccountReminderPrefs(accountId).catch(() => ({}));
        const parsed = parseNaturalLanguageReminder(text, {
          timezone: prefs.timezone || 'Africa/Lagos',
          defaultTime: prefs.defaultTime || '09:00',
        });
        if (!parsed) return web.sendJson(res, 400, { error: 'Could not parse the reminder text' });
        return web.sendJson(res, 200, {
          ok: true,
          parsed: {
            message: parsed.message,
            runAt: parsed.runAt.toISOString(),
            timezone: parsed.timezone,
            sourceText: parsed.sourceText,
          }
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/reminder') {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const body = await web.readBody(req);
        const sessionId = await getReminderSessionId(req);
        const accountId = await getReminderAccountId(req);
        if (!sessionId && !(await isOwnerAuthed(req))) return web.sendJson(res, 409, { error: 'Pair a WhatsApp session first' });
        const target = normalizeTargetJid(body.target || '');
        const message = String(body.message || '').trim();
        const rawRunAt = body.runAt ? new Date(body.runAt) : null;
        const tagAll = Boolean(body.tagAll);
        if (!target) return web.sendJson(res, 400, { error: 'Missing target' });
        if (!message) return web.sendJson(res, 400, { error: 'Missing reminder message' });
        const accountPrefs = accountId ? await getAccountReminderPrefs(accountId).catch(() => ({})) : {};
        const naturalLanguageEnabled = Boolean(body.naturalLanguageEnabled ?? accountPrefs.naturalLanguageEnabled);
        let parsed = null;
        if (naturalLanguageEnabled && String(body.text || '').trim()) {
          parsed = parseNaturalLanguageReminder(String(body.text || '').trim(), {
            timezone: body.timezone || accountPrefs.timezone || 'Africa/Lagos',
            defaultTime: body.defaultTime || accountPrefs.defaultTime || '09:00',
          });
        }
        if (!sessionId) return web.sendJson(res, 400, { error: 'No active WhatsApp session found' });
        const timezone = normalizeTimezone(body.timezone || accountPrefs.timezone || 'Africa/Lagos');
        const defaultTime = String(body.defaultTime || accountPrefs.defaultTime || '09:00');
        const runAt = parsed?.runAt || rawRunAt || (body.date ? new Date(body.date) : null);
        let finalRunAt = runAt;
        if (body.date && !body.time) {
          const dateOnly = new Date(body.date);
          if (!Number.isNaN(dateOnly.getTime())) {
            const [hour, minute] = String(defaultTime).split(':').map(Number);
            dateOnly.setHours(hour || 9, minute || 0, 0, 0);
            finalRunAt = dateOnly;
          }
        }
        if (!finalRunAt || Number.isNaN(finalRunAt.getTime())) {
          return web.sendJson(res, 400, { error: 'Invalid reminder time' });
        }
        const payload = {
          sessionId,
          accountId,
          chatJid: target,
          targetType: String(body.targetType || (target.endsWith('@g.us') ? 'group' : 'chat')),
          message: parsed?.message || message,
          runAt: finalRunAt,
          timezone,
          defaultTime,
          timeFormat: String(body.timeFormat || accountPrefs.timeFormat || '24h'),
          dateFormat: String(body.dateFormat || accountPrefs.dateFormat || 'DD/MM/YYYY'),
          naturalLanguageEnabled,
          sourceText: String(body.text || body.sourceText || ''),
          kind: 'normal',
          parentReminderId: '',
          tagAll,
          mentionMode: String(body.mentionMode || accountPrefs.mentionMode || (tagAll ? 'all' : 'none')),
          mentionJids: Array.isArray(body.mentionJids) ? body.mentionJids.map((item) => normalizeTargetJid(item)).filter(Boolean) : parseMentionTargets(body.mentionJids || ''),
          recurrenceType: String(body.recurrenceType || 'none'),
          recurrenceInterval: Number(body.recurrenceInterval || 1),
          recurrencePattern: String(body.recurrencePattern || ''),
          recurrenceWeekday: body.recurrenceWeekday === undefined || body.recurrenceWeekday === null || body.recurrenceWeekday === '' ? null : Number(body.recurrenceWeekday),
          recurrenceOrdinal: body.recurrenceOrdinal === undefined || body.recurrenceOrdinal === null || body.recurrenceOrdinal === '' ? null : Number(body.recurrenceOrdinal),
          recurrenceUnit: String(body.recurrenceUnit || 'minute'),
          advanceMinutes: Number(body.advanceMinutes || accountPrefs.advanceMinutes || 0),
          quietHoursEnabled: Boolean(body.quietHoursEnabled ?? accountPrefs.quietHoursEnabled),
          quietHoursStart: String(body.quietHoursStart || accountPrefs.quietHoursStart || ''),
          quietHoursEnd: String(body.quietHoursEnd || accountPrefs.quietHoursEnd || ''),
          quietHoursTimezone: normalizeTimezone(body.quietHoursTimezone || accountPrefs.quietHoursTimezone || timezone),
          snoozeMinutes: Number(body.snoozeMinutes || 0),
          ackAction: String(body.ackAction || 'keep'),
        };
        const created = await createReminderBundle(payload, accountPrefs).catch((error) => {
          throw error;
        });
        return web.sendJson(res, 200, {
          ok: true,
          target,
          runAt: finalRunAt.toISOString(),
          timezone,
          reminderId: created?._id || '',
        });
      }

      if (req.method === 'PATCH' && url.pathname.startsWith('/api/reminders/')) {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const reminderId = url.pathname.split('/')[3];
        if (!reminderId) return web.sendJson(res, 400, { error: 'Missing reminder id' });
        const reminder = await getReminderById(reminderId).catch(() => null);
        if (!reminder) return web.sendJson(res, 404, { error: 'Reminder not found' });
        const sessionId = await getReminderSessionId(req);
        if (!sessionId && !(await isOwnerAuthed(req))) return web.sendJson(res, 409, { error: 'Pair a WhatsApp session first' });
        if (sessionId && reminder.sessionId !== sessionId && !(await isOwnerAuthed(req))) {
          return web.sendJson(res, 403, { error: 'Forbidden' });
        }
        const body = await web.readBody(req);
        const patch = {};
        ['message', 'timezone', 'defaultTime', 'timeFormat', 'dateFormat', 'sourceText', 'mentionMode', 'recurrenceType', 'recurrencePattern', 'recurrenceUnit', 'ackAction', 'quietHoursStart', 'quietHoursEnd', 'quietHoursTimezone'].forEach((key) => {
          if (body[key] !== undefined) patch[key] = body[key];
        });
        if (body.runAt !== undefined) {
          const date = new Date(body.runAt);
          if (Number.isNaN(date.getTime())) return web.sendJson(res, 400, { error: 'Invalid reminder time' });
          patch.runAt = date;
        }
        if (body.tagAll !== undefined) patch.tagAll = Boolean(body.tagAll);
        if (body.naturalLanguageEnabled !== undefined) patch.naturalLanguageEnabled = Boolean(body.naturalLanguageEnabled);
        if (body.quietHoursEnabled !== undefined) patch.quietHoursEnabled = Boolean(body.quietHoursEnabled);
        if (body.advanceMinutes !== undefined) patch.advanceMinutes = Number(body.advanceMinutes || 0);
        if (body.recurrenceInterval !== undefined) patch.recurrenceInterval = Number(body.recurrenceInterval || 1);
        if (body.recurrenceWeekday !== undefined) patch.recurrenceWeekday = body.recurrenceWeekday === '' || body.recurrenceWeekday === null ? null : Number(body.recurrenceWeekday);
        if (body.recurrenceOrdinal !== undefined) patch.recurrenceOrdinal = body.recurrenceOrdinal === '' || body.recurrenceOrdinal === null ? null : Number(body.recurrenceOrdinal);
        if (body.mentionJids !== undefined) patch.mentionJids = Array.isArray(body.mentionJids) ? body.mentionJids.map((item) => normalizeTargetJid(item)).filter(Boolean) : parseMentionTargets(body.mentionJids || '');
        await updateReminder(reminderId, patch);
        if (body.runAt !== undefined || body.advanceMinutes !== undefined || body.recurrenceType !== undefined || body.recurrencePattern !== undefined || body.recurrenceInterval !== undefined) {
          await syncReminderAdvanceChild(reminderId).catch(() => {});
        }
        return web.sendJson(res, 200, { ok: true, reminderId });
      }

      if (req.method === 'POST' && url.pathname.startsWith('/api/reminders/') && url.pathname.endsWith('/action')) {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const reminderId = url.pathname.split('/')[3];
        const reminder = await getReminderById(reminderId).catch(() => null);
        if (!reminder) return web.sendJson(res, 404, { error: 'Reminder not found' });
        const sessionId = await getReminderSessionId(req);
        if (!sessionId && !(await isOwnerAuthed(req))) return web.sendJson(res, 409, { error: 'Pair a WhatsApp session first' });
        if (sessionId && reminder.sessionId !== sessionId && !(await isOwnerAuthed(req))) {
          return web.sendJson(res, 403, { error: 'Forbidden' });
        }
        const body = await web.readBody(req);
        const action = String(body.action || '').toLowerCase();
        if (action === 'delete') {
          await deleteReminderTree(reminderId);
          return web.sendJson(res, 200, { ok: true, action });
        }
        if (action === 'complete') {
          await completeReminder(reminderId);
          await deleteReminderChildren(reminderId).catch(() => {});
          return web.sendJson(res, 200, { ok: true, action });
        }
        if (action === 'snooze') {
          const snoozeMinutes = Number(body.snoozeMinutes || reminder.snoozeMinutes || 5);
          await snoozeReminder(reminderId, snoozeMinutes);
          await syncReminderAdvanceChild(reminderId).catch(() => {});
          return web.sendJson(res, 200, { ok: true, action, snoozeMinutes });
        }
        if (action === 'next-day') {
          const next = new Date(new Date(reminder.runAt).getTime() + 24 * 60 * 60 * 1000);
          await updateReminder(reminderId, { runAt: next, status: 'pending', updatedAt: new Date() });
          await syncReminderAdvanceChild(reminderId).catch(() => {});
          return web.sendJson(res, 200, { ok: true, action, runAt: next.toISOString() });
        }
        return web.sendJson(res, 400, { error: 'Unknown reminder action' });
      }

      if (req.method === 'DELETE' && url.pathname.startsWith('/api/reminders/')) {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const reminderId = url.pathname.split('/')[3];
        const reminder = await getReminderById(reminderId).catch(() => null);
        if (!reminder) return web.sendJson(res, 404, { error: 'Reminder not found' });
        const sessionId = await getReminderSessionId(req);
        if (sessionId && reminder.sessionId !== sessionId && !(await isOwnerAuthed(req))) {
          return web.sendJson(res, 403, { error: 'Forbidden' });
        }
        await deleteReminderTree(reminderId);
        return web.sendJson(res, 200, { ok: true, deleted: reminderId });
      }

      if (req.method === 'POST' && url.pathname === '/api/setting') {
        if (!(await isDashboardAuthed(req))) return web.sendJson(res, 401, { error: 'Unauthorized' });
        const body = await web.readBody(req);
        const key = String(body.key || '').trim();
        const target = String(body.target || '').trim() || 'bot';
        if (!key) return web.sendJson(res, 400, { error: 'Missing setting key' });
        const matched = web.CONTROL_CATALOG.find((item) => item.key === key);
        if (!matched) return web.sendJson(res, 400, { error: 'Unknown setting key' });
        const scopeSessionId = await web.getDashboardScopeSessionId(req).catch(() => '');
        if (!scopeSessionId && !(await isOwnerAuthed(req))) {
          return web.sendJson(res, 409, { error: 'Pair a WhatsApp session first' });
        }
        if (scopeSessionId && target !== scopeSessionId && getSetting(target, '__ownerSessionId', '') !== scopeSessionId) {
          return web.sendJson(res, 403, { error: 'Forbidden' });
        }
        const value = matched.kind === 'mode' ? String(body.value || 'public') : Boolean(body.value);
        setSetting(target, key, value);
        return web.sendJson(res, 200, { ok: true, target, key, value });
      }

      if (req.method === 'GET') {
        const page = await web.renderPage(req, url);
        if (page) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          return res.end(page);
        }
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    } catch (error) {
      return web.sendJson(res, 500, { error: error.message || 'Server error' });
    }
  });

  server.listen(PORT, () => {
    console.log(`[web] VOID MD dashboard running on http://localhost:${PORT}`);
  });
  return server;
}

function isAuthed(req) {
  const cookieName = web.COOKIE_NAME;
  const cookies = web.parseCookies(req.headers.cookie || '');
  const token = cookies[cookieName];
  if (!token) return Promise.resolve(false);
  if (sessions.has(token)) return Promise.resolve(true);
  return web.isAuthed(req).then((ok) => {
    if (ok) sessions.add(token);
    return ok;
  });
}

function isOwnerAuthed(req) {
  const cookieName = web.OWNER_COOKIE_NAME;
  const cookies = web.parseCookies(req.headers.cookie || '');
  const token = cookies[cookieName];
  if (!token || !token.startsWith('owner-')) return Promise.resolve(false);
  if (ownerSessions.has(token)) return Promise.resolve(true);
  return web.isOwnerAuthed(req).then((ok) => {
    if (ok) ownerSessions.add(token);
    return ok;
  });
}

function isDashboardAuthed(req) {
  return Promise.all([isAuthed(req), isOwnerAuthed(req)]).then(([a, b]) => a || b);
}

module.exports = { start };
