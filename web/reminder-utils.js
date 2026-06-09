const moment = require('moment-timezone');

const DEFAULT_TIMEZONE = 'Africa/Lagos';
const DEFAULT_DAILY_TIME = '09:00';

function normalizeTimezone(timezone, fallback = DEFAULT_TIMEZONE) {
  const candidate = String(timezone || '').trim();
  if (!candidate) return fallback;
  return moment.tz.zone(candidate) ? candidate : fallback;
}

function parseTimeString(value, fallback = DEFAULT_DAILY_TIME) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
  if (!match) {
    const fallbackMatch = String(fallback || DEFAULT_DAILY_TIME).trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!fallbackMatch) return { hour: 9, minute: 0 };
    return { hour: Number(fallbackMatch[1]), minute: Number(fallbackMatch[2]) };
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = (match[3] || '').toLowerCase();
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (meridiem === 'pm' && hour < 12) hour += 12;
  return { hour, minute };
}

function applyDefaultTime(dateValue, timezone, defaultTime = DEFAULT_DAILY_TIME) {
  const tz = normalizeTimezone(timezone);
  const date = moment.tz(String(dateValue || '').trim(), tz);
  if (!date.isValid()) return null;
  const { hour, minute } = parseTimeString(defaultTime, DEFAULT_DAILY_TIME);
  return date.hour(hour).minute(minute).second(0).millisecond(0).toDate();
}

function parseNaturalLanguageReminder(input, { timezone = DEFAULT_TIMEZONE, defaultTime = DEFAULT_DAILY_TIME, now = new Date() } = {}) {
  const tz = normalizeTimezone(timezone);
  const text = String(input || '').trim().replace(/\s+/g, ' ');
  if (!text) return null;

  const cleaned = text
    .replace(/^remind\s+me\s+to\s+/i, '')
    .replace(/^remind\s+us\s+to\s+/i, '')
    .replace(/^remind\s+me\s+/i, '')
    .replace(/^set\s+reminder\s+to\s+/i, '')
    .trim();

  const relativePatterns = [
    /^(.*?)\s+in\s+(\d+)\s*(second|seconds|minute|minutes|hour|hours|day|days|week|weeks)$/i,
    /^(.*?)\s+in\s+(\d+)\s*(second|seconds|minute|minutes|hour|hours|day|days|week|weeks)\s+from\s+now$/i,
  ];
  for (const pattern of relativePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const message = match[1].trim();
      const amount = Number(match[2]);
      const unitRaw = match[3].toLowerCase();
      const unit = unitRaw.startsWith('second') ? 'seconds'
        : unitRaw.startsWith('minute') ? 'minutes'
        : unitRaw.startsWith('hour') ? 'hours'
        : unitRaw.startsWith('day') ? 'days'
        : 'weeks';
      const runAt = moment.tz(now, tz).add(amount, unit).toDate();
      return { message, runAt, parsed: true, sourceText: text, timezone: tz };
    }
  }

  const tomorrowMatch = cleaned.match(/^(.*?)\s+tomorrow\s+at\s+(.+)$/i);
  if (tomorrowMatch) {
    const message = tomorrowMatch[1].trim();
    const timePart = tomorrowMatch[2].trim();
    const { hour, minute } = parseTimeString(timePart, defaultTime);
    const runAt = moment.tz(now, tz).add(1, 'day').hour(hour).minute(minute).second(0).millisecond(0).toDate();
    return { message, runAt, parsed: true, sourceText: text, timezone: tz };
  }

  const todayMatch = cleaned.match(/^(.*?)\s+today\s+at\s+(.+)$/i);
  if (todayMatch) {
    const message = todayMatch[1].trim();
    const timePart = todayMatch[2].trim();
    const { hour, minute } = parseTimeString(timePart, defaultTime);
    const base = moment.tz(now, tz).hour(hour).minute(minute).second(0).millisecond(0);
    const runAt = base.toDate();
    if (runAt.getTime() < now.getTime()) {
      return { message, runAt: base.add(1, 'day').toDate(), parsed: true, sourceText: text, timezone: tz };
    }
    return { message, runAt, parsed: true, sourceText: text, timezone: tz };
  }

  const dateTimeMatch = cleaned.match(/^(.*?)\s+(?:on\s+)?(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s+at\s+(.+)$/i);
  if (dateTimeMatch) {
    const message = dateTimeMatch[1].trim();
    const datePart = dateTimeMatch[2].trim();
    const timePart = dateTimeMatch[3].trim();
    const formats = ['YYYY-MM-DD', 'D/M/YYYY', 'DD/MM/YYYY', 'M/D/YYYY', 'MM/DD/YYYY', 'D-M-YYYY', 'DD-MM-YYYY', 'M-D-YYYY', 'MM-DD-YYYY'];
    let date = moment.tz(datePart, formats, true, tz);
    if (!date.isValid()) {
      date = moment.tz(datePart, tz);
    }
    if (!date.isValid()) return null;
    const { hour, minute } = parseTimeString(timePart, defaultTime);
    const runAt = date.hour(hour).minute(minute).second(0).millisecond(0).toDate();
    return { message, runAt, parsed: true, sourceText: text, timezone: tz };
  }

  const dateOnlyMatch = cleaned.match(/^(.*?)\s+(?:on\s+)?(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})$/i);
  if (dateOnlyMatch) {
    const message = dateOnlyMatch[1].trim();
    const datePart = dateOnlyMatch[2].trim();
    const runAt = applyDefaultTime(datePart, tz, defaultTime);
    if (!runAt) return null;
    return { message, runAt, parsed: true, sourceText: text, timezone: tz };
  }

  return null;
}

function buildNthWeekdayCandidate(baseMoment, weekday, ordinal) {
  const monthStart = baseMoment.clone().startOf('month');
  const firstWeekday = monthStart.day();
  const targetWeekday = Number(weekday);
  const targetOrdinal = Math.max(1, Number(ordinal) || 1);
  const delta = (targetWeekday - firstWeekday + 7) % 7;
  const dayOfMonth = 1 + delta + (targetOrdinal - 1) * 7;
  const candidate = monthStart.date(dayOfMonth);
  if (candidate.month() !== monthStart.month()) return null;
  return candidate;
}

function computeNextRecurrence(reminder, fromDate = reminder?.runAt || new Date()) {
  const tz = normalizeTimezone(reminder?.timezone);
  const base = moment.tz(fromDate, tz);
  const interval = Math.max(1, Number(reminder?.recurrenceInterval) || 1);
  const type = String(reminder?.recurrenceType || '').toLowerCase();

  if (!type || type === 'none') return null;

  if (type === 'daily') return base.clone().add(interval, 'day').toDate();
  if (type === 'weekly') return base.clone().add(interval, 'week').toDate();
  if (type === 'monthly') {
    if (reminder?.recurrencePattern === 'nth-weekday') {
      const weekday = Number(reminder?.recurrenceWeekday);
      const ordinal = Number(reminder?.recurrenceOrdinal) || 1;
      let cursor = base.clone().add(1, 'day').startOf('month');
      for (let i = 0; i < 24; i += 1) {
        const candidate = buildNthWeekdayCandidate(cursor, weekday, ordinal);
        if (candidate && candidate.isAfter(base)) return candidate.toDate();
        cursor.add(1, 'month');
      }
      return null;
    }
    return base.clone().add(interval, 'month').toDate();
  }
  if (type === 'yearly') return base.clone().add(interval, 'year').toDate();
  if (type === 'custom') {
    const unit = String(reminder?.recurrenceUnit || 'minute').toLowerCase();
    const validUnit = ['minute', 'hour', 'day', 'week', 'month', 'year'].includes(unit) ? unit : 'minute';
    return base.clone().add(interval, validUnit).toDate();
  }
  return null;
}

function isInQuietHours(referenceDate, prefs = {}, timezone = DEFAULT_TIMEZONE) {
  if (!prefs?.quietHoursEnabled) {
    return { inQuietHours: false, resumeAt: null };
  }
  const tz = normalizeTimezone(prefs.quietHoursTimezone || timezone);
  const startRaw = String(prefs.quietHoursStart || '').trim();
  const endRaw = String(prefs.quietHoursEnd || '').trim();
  if (!startRaw || !endRaw) {
    return { inQuietHours: false, resumeAt: null };
  }

  const start = parseTimeString(startRaw, '00:00');
  const end = parseTimeString(endRaw, '00:00');
  const now = moment.tz(referenceDate || new Date(), tz);
  const current = now.hours() * 60 + now.minutes();
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;

  const crossesMidnight = startMinutes >= endMinutes;
  const inQuietHours = crossesMidnight
    ? current >= startMinutes || current < endMinutes
    : current >= startMinutes && current < endMinutes;

  if (!inQuietHours) {
    return { inQuietHours: false, resumeAt: null };
  }

  const resume = now.clone();
  if (crossesMidnight) {
    if (current >= startMinutes) {
      const addDays = current >= startMinutes ? 1 : 0;
      resume.add(addDays, 'day').hour(end.hour).minute(end.minute).second(0).millisecond(0);
    } else {
      resume.hour(end.hour).minute(end.minute).second(0).millisecond(0);
    }
  } else {
    resume.hour(end.hour).minute(end.minute).second(0).millisecond(0);
    if (resume.isBefore(now)) resume.add(1, 'day');
  }

  return { inQuietHours: true, resumeAt: resume.toDate() };
}

function buildReminderDeliveryText(reminder, { mentionTargets = [], advance = false } = {}) {
  const prefix = advance ? '[Reminder soon]:' : '[Reminder]:';
  const text = `${prefix} ${String(reminder?.message || '').trim()}`.trim();
  const mentions = Array.isArray(mentionTargets) ? mentionTargets.filter(Boolean) : [];
  if (reminder?.mentionMode === 'all') {
    return { text: `@all ${text}`, mentions };
  }
  if (mentions.length) {
    return { text, mentions };
  }
  return { text, mentions: [] };
}

function getReminderMentionTargets(reminder, participants = []) {
  if (!reminder) return [];
  const direct = String(reminder.chatJid || '').endsWith('@g.us');
  if (!direct) return [];
  if (reminder.mentionMode === 'all' || reminder.tagAll) {
    return participants.map((member) => member.id).filter(Boolean);
  }
  if (Array.isArray(reminder.mentionJids)) {
    return reminder.mentionJids.map((value) => String(value || '').trim()).filter(Boolean);
  }
  const raw = String(reminder.mentionList || '').trim();
  if (!raw) return [];
  return raw.split(/[,\n]/).map((value) => value.trim()).filter(Boolean);
}

module.exports = {
  DEFAULT_TIMEZONE,
  DEFAULT_DAILY_TIME,
  normalizeTimezone,
  parseTimeString,
  applyDefaultTime,
  parseNaturalLanguageReminder,
  computeNextRecurrence,
  isInQuietHours,
  buildReminderDeliveryText,
  getReminderMentionTargets,
};
