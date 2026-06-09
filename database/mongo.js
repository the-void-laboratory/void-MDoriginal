require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { BufferJSON } = require('@whiskeysockets/baileys');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || undefined;

let connectPromise = null;

const SettingSchema = new mongoose.Schema(
  {
    jid: { type: String, required: true, unique: true, index: true },
    data: { type: String, default: '{}' },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const SessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    accountId: { type: String, default: '', index: true },
    jid: { type: String, default: '' },
    number: { type: String, default: '' },
    status: { type: String, default: 'active', index: true },
    pairingCode: { type: String, default: '' },
    pairingAt: { type: Date },
    lastConnectedAt: { type: Date },
    lastDisconnect: { type: String, default: '' },
    deleteReason: { type: String, default: '' },
    credsUpdatedAt: { type: Date },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date },
  },
  { versionKey: false }
);

const SessionFileSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    filePath: { type: String, required: true },
    contentBase64: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);
SessionFileSchema.index({ sessionId: 1, filePath: 1 }, { unique: true });

const ReminderSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    accountId: { type: String, default: '', index: true },
    chatJid: { type: String, required: true, index: true },
    targetType: { type: String, default: '', index: true },
    message: { type: String, required: true },
    runAt: { type: Date, required: true, index: true },
    timezone: { type: String, default: '' },
    defaultTime: { type: String, default: '09:00' },
    timeFormat: { type: String, default: '24h' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    naturalLanguageEnabled: { type: Boolean, default: false },
    sourceText: { type: String, default: '' },
    kind: { type: String, default: 'normal', index: true },
    parentReminderId: { type: String, default: '', index: true },
    tagAll: { type: Boolean, default: false },
    mentionMode: { type: String, default: 'none', index: true },
    mentionJids: { type: [String], default: [] },
    recurrenceType: { type: String, default: 'none', index: true },
    recurrenceInterval: { type: Number, default: 1 },
    recurrencePattern: { type: String, default: '' },
    recurrenceWeekday: { type: Number, default: null },
    recurrenceOrdinal: { type: Number, default: null },
    recurrenceUnit: { type: String, default: 'minute' },
    advanceMinutes: { type: Number, default: 0 },
    quietHoursEnabled: { type: Boolean, default: false },
    quietHoursStart: { type: String, default: '' },
    quietHoursEnd: { type: String, default: '' },
    quietHoursTimezone: { type: String, default: '' },
    snoozeMinutes: { type: Number, default: 0 },
    ackAction: { type: String, default: 'keep' },
    status: { type: String, default: 'pending', index: true },
    createdAt: { type: Date, default: Date.now },
    sentAt: { type: Date },
    completedAt: { type: Date },
    deletedAt: { type: Date },
    snoozedUntil: { type: Date },
    lastTriggeredAt: { type: Date },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const AccountSchema = new mongoose.Schema(
  {
    accountId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    accessCodeHash: { type: String, required: true },
    accessCodeSalt: { type: String, required: true },
    accessCodeHint: { type: String, default: '' },
    linkedSessionId: { type: String, default: '', index: true },
    reminderPrefs: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date },
  },
  { versionKey: false }
);

const WebSessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    accountId: { type: String, default: '', index: true },
    pairedSessionId: { type: String, default: '', index: true },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    userAgent: { type: String, default: '' },
  },
  { versionKey: false }
);

const Setting = mongoose.models.VoidSetting || mongoose.model('VoidSetting', SettingSchema);
const Session = mongoose.models.VoidSession || mongoose.model('VoidSession', SessionSchema);
const SessionFile = mongoose.models.VoidSessionFile || mongoose.model('VoidSessionFile', SessionFileSchema);
const Reminder = mongoose.models.VoidReminder || mongoose.model('VoidReminder', ReminderSchema);
const Account = mongoose.models.VoidAccount || mongoose.model('VoidAccount', AccountSchema);
const WebSession = mongoose.models.VoidWebSession || mongoose.model('VoidWebSession', WebSessionSchema);

function serialize(value) {
  return JSON.stringify(value, BufferJSON.replacer);
}

function deserialize(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  try {
    return JSON.parse(value, BufferJSON.reviver);
  } catch {
    return fallback;
  }
}

async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectPromise) return connectPromise;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing. Set it to your MongoDB Atlas connection string.');
  }

  connectPromise = mongoose.connect(MONGODB_URI, {
    dbName: MONGODB_DB,
    autoIndex: true,
    serverSelectionTimeoutMS: 15000,
  });

  try {
    await connectPromise;
    return mongoose.connection;
  } finally {
    connectPromise = null;
  }
}

async function ensureConnected() {
  await connectMongo();
}

async function loadSettingsSnapshot() {
  await ensureConnected();
  const docs = await Setting.find().lean();
  const snapshot = {};
  for (const doc of docs) {
    snapshot[doc.jid] = deserialize(doc.data, {});
  }
  return snapshot;
}

async function upsertSettingDoc(jid, data) {
  await ensureConnected();
  await Setting.updateOne(
    { jid },
    { $set: { data: serialize(data), updatedAt: new Date() } },
    { upsert: true }
  );
  return data;
}

async function getSettingDoc(jid) {
  await ensureConnected();
  const doc = await Setting.findOne({ jid }).lean();
  return deserialize(doc?.data, {});
}

async function deleteSettingDoc(jid) {
  await ensureConnected();
  await Setting.deleteOne({ jid });
}

async function loadSessionIds({ status = 'active', accountId = '' } = {}) {
  await ensureConnected();
  const query = {};
  if (status) query.status = status;
  if (accountId) query.accountId = accountId;
  const docs = await Session.find(query).sort({ updatedAt: -1 }).lean();
  return docs.map((doc) => doc.sessionId);
}

async function getSessionDoc(sessionId) {
  await ensureConnected();
  return Session.findOne({ sessionId }).lean();
}

async function upsertSessionMeta(sessionId, patch = {}) {
  await ensureConnected();
  const set = { ...patch, updatedAt: new Date() };
  const insertSet = { createdAt: new Date() };
  if (!Object.prototype.hasOwnProperty.call(patch, 'status')) {
    insertSet.status = 'active';
  }
  await Session.updateOne(
    { sessionId },
    { $set: set, $setOnInsert: insertSet },
    { upsert: true }
  );
}

async function touchSession(sessionId, patch = {}) {
  await upsertSessionMeta(sessionId, patch);
}

async function setSessionCreds(sessionId, creds) {
  await upsertSessionMeta(sessionId, {
    creds: serialize(creds),
    credsUpdatedAt: new Date(),
    status: 'active',
  });
}

async function getSessionCreds(sessionId) {
  await ensureConnected();
  const doc = await Session.findOne({ sessionId }).lean();
  return deserialize(doc?.creds, null);
}

async function setSessionFile(sessionId, filePath, buffer) {
  await ensureConnected();
  await SessionFile.updateOne(
    { sessionId, filePath },
    {
      $set: {
        contentBase64: Buffer.from(buffer).toString('base64'),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

async function syncSessionFolderToMongo(sessionId, folderPath) {
  await ensureConnected();
  const files = [];

  const walk = (dir, base = dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, base);
      } else {
        files.push({
          filePath: path.relative(base, fullPath).replace(/\\/g, '/'),
          buffer: fs.readFileSync(fullPath),
        });
      }
    }
  };

  walk(folderPath);

  const seen = [];
  for (const file of files) {
    seen.push(file.filePath);
    await setSessionFile(sessionId, file.filePath, file.buffer);
  }

  await SessionFile.deleteMany({
    sessionId,
    filePath: { $nin: seen.length ? seen : ['__none__'] },
  });

  await touchSession(sessionId, { status: 'active' });
}

async function restoreSessionFolderFromMongo(sessionId, folderPath) {
  await ensureConnected();
  const docs = await SessionFile.find({ sessionId }).lean();
  if (!docs.length) return false;

  fs.mkdirSync(folderPath, { recursive: true });
  for (const doc of docs) {
    const target = path.join(folderPath, doc.filePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(doc.contentBase64 || '', 'base64'));
  }
  return true;
}

async function deleteSessionArtifacts(sessionId, reason = '') {
  await ensureConnected();
  const account = await Account.findOne({ linkedSessionId: sessionId }).lean().catch(() => null);
  await Promise.all([
    Session.deleteOne({ sessionId }),
    SessionFile.deleteMany({ sessionId }),
    Reminder.deleteMany({ sessionId }),
    Account.updateOne(
      { linkedSessionId: sessionId },
      { $set: { linkedSessionId: '', updatedAt: new Date() } }
    ),
    WebSession.deleteMany({
      $or: [
        { pairedSessionId: sessionId },
        ...(account?.accountId ? [{ accountId: account.accountId }] : []),
      ],
    }),
  ]);
  if (reason) return;
}

async function markSessionDisconnected(sessionId, reason = '') {
  await ensureConnected();
  await Session.updateOne(
    { sessionId },
    {
      $set: {
        status: 'disconnected',
        lastDisconnect: reason,
        updatedAt: new Date(),
      },
    }
  );
}

async function markSessionLoggedOut(sessionId, reason = 'logged_out') {
  await ensureConnected();
  const account = await Account.findOne({ linkedSessionId: sessionId }).lean().catch(() => null);
  await Session.updateOne(
    { sessionId },
    {
      $set: {
        status: 'deleted',
        deleteReason: reason,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );
  if (account?.accountId) {
    await WebSession.deleteMany({ accountId: account.accountId }).catch(() => {});
  }
  await deleteSessionArtifacts(sessionId, reason);
}

function generateAccountId() {
  return `account-${crypto.randomBytes(12).toString('hex')}`;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashSecret(value, salt) {
  return crypto.createHash('sha256').update(`${salt}:${String(value || '')}`).digest('hex');
}

async function createAccount({ email, password, accessCode, linkedSessionId = '' }) {
  await ensureConnected();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password || !accessCode) {
    throw new Error('Email, password, and access code are required');
  }
  const existing = await Account.findOne({ email: normalizedEmail }).lean();
  if (existing) {
    throw new Error('An account with that email already exists');
  }
  const passwordSalt = crypto.randomBytes(16).toString('hex');
  const accessCodeSalt = crypto.randomBytes(16).toString('hex');
  const account = await Account.create({
    accountId: generateAccountId(),
    email: normalizedEmail,
    passwordHash: hashSecret(password, passwordSalt),
    passwordSalt,
    accessCodeHash: hashSecret(accessCode, accessCodeSalt),
    accessCodeSalt,
    accessCodeHint: String(accessCode).slice(-4),
    linkedSessionId: linkedSessionId || '',
    reminderPrefs: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return account.toObject();
}

async function getAccountByEmail(email) {
  await ensureConnected();
  return Account.findOne({ email: normalizeEmail(email) }).lean();
}

async function getAccountByAccountId(accountId) {
  await ensureConnected();
  return Account.findOne({ accountId }).lean();
}

async function authenticateAccount(email, password, accessCode) {
  await ensureConnected();
  const account = await getAccountByEmail(email);
  if (!account) return null;
  if (account.passwordHash !== hashSecret(password, account.passwordSalt)) return null;
  if (account.accessCodeHash !== hashSecret(accessCode, account.accessCodeSalt)) return null;
  await Account.updateOne(
    { accountId: account.accountId },
    { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
  );
  return account;
}

async function setAccountLinkedSession(accountId, sessionId) {
  await ensureConnected();
  await Account.updateOne(
    { accountId },
    { $set: { linkedSessionId: sessionId || '', updatedAt: new Date() } }
  );
}

async function clearAccountLinkedSession(sessionId) {
  await ensureConnected();
  await Account.updateMany(
    { linkedSessionId: sessionId },
    { $set: { linkedSessionId: '', updatedAt: new Date() } }
  );
}

async function upsertReminder(reminder) {
  await ensureConnected();
  const doc = await Reminder.create({
    sessionId: reminder.sessionId,
    accountId: reminder.accountId || '',
    chatJid: reminder.chatJid,
    targetType: reminder.targetType || (String(reminder.chatJid || '').endsWith('@g.us') ? 'group' : 'chat'),
    message: reminder.message,
    runAt: reminder.runAt,
    timezone: reminder.timezone || '',
    defaultTime: reminder.defaultTime || '09:00',
    timeFormat: reminder.timeFormat || '24h',
    dateFormat: reminder.dateFormat || 'DD/MM/YYYY',
    naturalLanguageEnabled: Boolean(reminder.naturalLanguageEnabled),
    sourceText: reminder.sourceText || '',
    kind: reminder.kind || 'normal',
    parentReminderId: reminder.parentReminderId || '',
    tagAll: Boolean(reminder.tagAll),
    mentionMode: reminder.mentionMode || 'none',
    mentionJids: Array.isArray(reminder.mentionJids) ? reminder.mentionJids.filter(Boolean) : [],
    recurrenceType: reminder.recurrenceType || 'none',
    recurrenceInterval: Number(reminder.recurrenceInterval || 1),
    recurrencePattern: reminder.recurrencePattern || '',
    recurrenceWeekday: reminder.recurrenceWeekday ?? null,
    recurrenceOrdinal: reminder.recurrenceOrdinal ?? null,
    recurrenceUnit: reminder.recurrenceUnit || 'minute',
    advanceMinutes: Number(reminder.advanceMinutes || 0),
    quietHoursEnabled: Boolean(reminder.quietHoursEnabled),
    quietHoursStart: reminder.quietHoursStart || '',
    quietHoursEnd: reminder.quietHoursEnd || '',
    quietHoursTimezone: reminder.quietHoursTimezone || '',
    snoozeMinutes: Number(reminder.snoozeMinutes || 0),
    ackAction: reminder.ackAction || 'keep',
    status: reminder.status || 'pending',
    createdAt: reminder.createdAt || new Date(),
    sentAt: reminder.sentAt,
    completedAt: reminder.completedAt,
    deletedAt: reminder.deletedAt,
    snoozedUntil: reminder.snoozedUntil,
    lastTriggeredAt: reminder.lastTriggeredAt,
    updatedAt: reminder.updatedAt || new Date(),
  });
  return doc.toObject();
}

async function listPendingReminders(sessionId) {
  await ensureConnected();
  return Reminder.find({
    sessionId,
    status: 'pending',
  }).sort({ runAt: 1 }).lean();
}

async function listReminders({ sessionId = '', accountId = '', status = '', kind = '', parentReminderId = '', chatJid = '' } = {}) {
  await ensureConnected();
  const query = {};
  if (sessionId) query.sessionId = sessionId;
  if (accountId) query.accountId = accountId;
  if (status) {
    query.status = Array.isArray(status) ? { $in: status } : status;
  }
  if (kind) query.kind = kind;
  if (parentReminderId) query.parentReminderId = parentReminderId;
  if (chatJid) query.chatJid = chatJid;
  return Reminder.find(query).sort({ runAt: 1, createdAt: -1 }).lean();
}

async function getReminderById(reminderId) {
  await ensureConnected();
  return Reminder.findById(reminderId).lean();
}

async function updateReminder(reminderId, patch = {}) {
  await ensureConnected();
  const set = { ...patch, updatedAt: new Date() };
  if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
    if (patch.status === 'completed') set.completedAt = patch.completedAt || new Date();
    if (patch.status === 'deleted') set.deletedAt = patch.deletedAt || new Date();
  }
  await Reminder.updateOne({ _id: reminderId }, { $set: set });
}

async function deleteReminder(reminderId) {
  await ensureConnected();
  await Reminder.deleteOne({ _id: reminderId });
}

async function deleteReminderTree(reminderId) {
  await ensureConnected();
  const doc = await Reminder.findById(reminderId).lean().catch(() => null);
  if (!doc) {
    await Reminder.deleteOne({ _id: reminderId }).catch(() => {});
    return;
  }
  await Reminder.deleteMany({
    $or: [
      { _id: reminderId },
      { parentReminderId: String(reminderId) },
      { parentReminderId: doc.parentReminderId || '' },
    ],
  });
}

async function deleteReminderChildren(parentReminderId) {
  await ensureConnected();
  await Reminder.deleteMany({
    parentReminderId: String(parentReminderId || ''),
  });
}

async function completeReminder(reminderId) {
  await ensureConnected();
  await Reminder.updateOne(
    { _id: reminderId },
    { $set: { status: 'completed', completedAt: new Date(), updatedAt: new Date() } }
  );
}

async function snoozeReminder(reminderId, snoozeMinutes = 5) {
  await ensureConnected();
  const minutes = Math.max(1, Number(snoozeMinutes) || 5);
  const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000);
  await Reminder.updateOne(
    { _id: reminderId },
    {
      $set: {
        status: 'pending',
        snoozedUntil,
        runAt: snoozedUntil,
        updatedAt: new Date(),
      }
    }
  );
  return snoozedUntil;
}

async function setReminderSnooze(reminderId, snoozeMinutes = 5) {
  return snoozeReminder(reminderId, snoozeMinutes);
}

async function getAccountReminderPrefs(accountId) {
  await ensureConnected();
  const account = await Account.findOne({ accountId }).lean();
  return account?.reminderPrefs || {};
}

async function updateAccountReminderPrefs(accountId, prefs = {}) {
  await ensureConnected();
  await Account.updateOne(
    { accountId },
    { $set: { reminderPrefs: prefs, updatedAt: new Date() } }
  );
  return prefs;
}

async function createReminderBundle(reminder, prefs = {}) {
  await ensureConnected();
  const main = await upsertReminder({
    ...reminder,
    accountId: reminder.accountId || prefs.accountId || '',
    timezone: reminder.timezone || prefs.timezone || '',
    defaultTime: reminder.defaultTime || prefs.defaultTime || '09:00',
    timeFormat: reminder.timeFormat || prefs.timeFormat || '24h',
    dateFormat: reminder.dateFormat || prefs.dateFormat || 'DD/MM/YYYY',
    naturalLanguageEnabled: reminder.naturalLanguageEnabled ?? prefs.naturalLanguageEnabled ?? false,
    advanceMinutes: Number(reminder.advanceMinutes ?? prefs.advanceMinutes ?? 0),
    quietHoursEnabled: reminder.quietHoursEnabled ?? prefs.quietHoursEnabled ?? false,
    quietHoursStart: reminder.quietHoursStart || prefs.quietHoursStart || '',
    quietHoursEnd: reminder.quietHoursEnd || prefs.quietHoursEnd || '',
    quietHoursTimezone: reminder.quietHoursTimezone || prefs.quietHoursTimezone || '',
    mentionMode: reminder.mentionMode || prefs.mentionMode || 'none',
    mentionJids: Array.isArray(reminder.mentionJids) ? reminder.mentionJids : (Array.isArray(prefs.mentionJids) ? prefs.mentionJids : []),
    recurrenceType: reminder.recurrenceType || prefs.recurrenceType || 'none',
    recurrenceInterval: reminder.recurrenceInterval ?? prefs.recurrenceInterval ?? 1,
    recurrencePattern: reminder.recurrencePattern || prefs.recurrencePattern || '',
    recurrenceWeekday: reminder.recurrenceWeekday ?? prefs.recurrenceWeekday ?? null,
    recurrenceOrdinal: reminder.recurrenceOrdinal ?? prefs.recurrenceOrdinal ?? null,
    recurrenceUnit: reminder.recurrenceUnit || prefs.recurrenceUnit || 'minute',
    ackAction: reminder.ackAction || prefs.ackAction || 'keep',
  });

  const advanceMinutes = Number(main.advanceMinutes || 0);
  if (advanceMinutes > 0 && main.runAt) {
    const advanceRunAt = new Date(new Date(main.runAt).getTime() - advanceMinutes * 60 * 1000);
    if (advanceRunAt.getTime() > Date.now()) {
      await upsertReminder({
        sessionId: main.sessionId,
        accountId: main.accountId,
        chatJid: main.chatJid,
        targetType: main.targetType,
        message: main.message,
        runAt: advanceRunAt,
        timezone: main.timezone,
        defaultTime: main.defaultTime,
        timeFormat: main.timeFormat,
        dateFormat: main.dateFormat,
        naturalLanguageEnabled: main.naturalLanguageEnabled,
        sourceText: main.sourceText,
        kind: 'advance',
        parentReminderId: String(main._id),
        tagAll: main.tagAll,
        mentionMode: main.mentionMode,
        mentionJids: main.mentionJids,
        recurrenceType: 'none',
        advanceMinutes: 0,
        quietHoursEnabled: main.quietHoursEnabled,
        quietHoursStart: main.quietHoursStart,
        quietHoursEnd: main.quietHoursEnd,
        quietHoursTimezone: main.quietHoursTimezone,
        snoozeMinutes: main.snoozeMinutes,
        ackAction: 'keep',
        status: 'pending',
      });
    }
  }

  return main;
}

async function markReminderSent(reminderId) {
  await ensureConnected();
  await Reminder.updateOne(
    { _id: reminderId },
    { $set: { status: 'sent', sentAt: new Date() } }
  );
}

async function removeReminder(reminderId) {
  await ensureConnected();
  await Reminder.deleteOne({ _id: reminderId });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createWebSession(token, { expiresAt, userAgent = '', accountId = '', pairedSessionId = '' } = {}) {
  await ensureConnected();
  const tokenHash = hashToken(token);
  await WebSession.updateOne(
    { tokenHash },
    {
      $set: {
        lastUsedAt: new Date(),
        expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent,
        accountId,
        pairedSessionId,
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
  return tokenHash;
}

async function getWebSessionByToken(token) {
  await ensureConnected();
  const tokenHash = hashToken(token);
  return WebSession.findOne({ tokenHash }).lean();
}

async function validateWebSession(token) {
  await ensureConnected();
  const tokenHash = hashToken(token);
  const doc = await WebSession.findOne({ tokenHash }).lean();
  if (!doc) return false;
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) {
    await WebSession.deleteOne({ tokenHash });
    return false;
  }
  if (doc.accountId) {
    const account = await Account.findOne({ accountId: doc.accountId }).lean().catch(() => null);
    if (!account) {
      await WebSession.deleteOne({ tokenHash }).catch(() => {});
      return false;
    }
  }
  await WebSession.updateOne({ tokenHash }, { $set: { lastUsedAt: new Date() } });
  return true;
}

async function destroyWebSession(token) {
  await ensureConnected();
  await WebSession.deleteOne({ tokenHash: hashToken(token) });
}

async function attachWebSessionPair(token, sessionId) {
  await ensureConnected();
  const webSession = await WebSession.findOne({ tokenHash: hashToken(token) }).lean().catch(() => null);
  await WebSession.updateOne(
    { tokenHash: hashToken(token) },
    {
      $set: {
        pairedSessionId: sessionId || '',
        accountId: webSession?.accountId || '',
        lastUsedAt: new Date(),
      },
    }
  );
  if (webSession?.accountId) {
    await setAccountLinkedSession(webSession.accountId, sessionId || '').catch(() => {});
    await Session.updateOne(
      { sessionId },
      { $set: { accountId: webSession.accountId, updatedAt: new Date() } },
      { upsert: true }
    ).catch(() => {});
  }
}

async function detachWebSessionPair(token) {
  await ensureConnected();
  const webSession = await WebSession.findOne({ tokenHash: hashToken(token) }).lean().catch(() => null);
  await WebSession.updateOne(
    { tokenHash: hashToken(token) },
    { $set: { pairedSessionId: '', accountId: webSession?.accountId || '', lastUsedAt: new Date() } }
  );
  if (webSession?.accountId) {
    await setAccountLinkedSession(webSession.accountId, '').catch(() => {});
  }
}

function getSessionFolder(sessionId) {
  return path.join(__dirname, '..', 'richstore', 'pairing', sessionId);
}

module.exports = {
  connectMongo,
  loadSettingsSnapshot,
  upsertSettingDoc,
  getSettingDoc,
  deleteSettingDoc,
  loadSessionIds,
  getSessionDoc,
  upsertSessionMeta,
  touchSession,
  setSessionCreds,
  getSessionCreds,
  setSessionFile,
  syncSessionFolderToMongo,
  restoreSessionFolderFromMongo,
  deleteSessionArtifacts,
  markSessionDisconnected,
  markSessionLoggedOut,
  createAccount,
  getAccountByEmail,
  getAccountByAccountId,
  authenticateAccount,
  setAccountLinkedSession,
  clearAccountLinkedSession,
  upsertReminder,
  listPendingReminders,
  listReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  deleteReminderTree,
  deleteReminderChildren,
  completeReminder,
  snoozeReminder,
  setReminderSnooze,
  getAccountReminderPrefs,
  updateAccountReminderPrefs,
  createReminderBundle,
  markReminderSent,
  removeReminder,
  createWebSession,
  getWebSessionByToken,
  validateWebSession,
  destroyWebSession,
  attachWebSessionPair,
  detachWebSessionPair,
  getSessionFolder,
  serialize,
  deserialize,
};
