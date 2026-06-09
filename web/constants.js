const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/commands', label: 'Command Management' },
  { href: '/groups', label: 'Groups' },
  { href: '/business', label: 'Business' },
  { href: '/chats', label: 'Chats' },
  { href: '/pairing', label: 'Pairing' }
];

const CONTROL_CATALOG = [
  { page: 'commands', section: 'System', key: 'mode', label: 'Bot Mode', kind: 'mode', scope: 'bot', description: 'Switch between public and self mode.' },
  { page: 'commands', section: 'Groups', key: 'welcome', label: 'Welcome', kind: 'toggle', scope: 'chat', description: 'Join and leave notices for a group.' },
  { page: 'commands', section: 'Groups', key: 'autoReact', label: 'Auto React', kind: 'toggle', scope: 'chat', description: 'React to messages in a group.' },
  { page: 'commands', section: 'Groups', key: 'autoTyping', label: 'Auto Typing', kind: 'toggle', scope: 'chat', description: 'Show typing state in a group.' },
  { page: 'commands', section: 'Groups', key: 'autoRecording', kind: 'toggle', scope: 'chat', description: 'Show recording state in a group.' },
  { page: 'commands', section: 'Groups', key: 'autoRecordType', label: 'Auto Record Type', kind: 'toggle', scope: 'chat', description: 'Show typed audio state in a group.' },
  { page: 'commands', section: 'Groups', key: 'antilink', label: 'Anti Link', kind: 'toggle', scope: 'chat', description: 'Block WhatsApp invite links in a group.' },
  { page: 'commands', section: 'Business', key: 'feature.autoreply', label: 'Auto Reply', kind: 'toggle', scope: 'chat', description: 'Reply automatically to matched text.' },
  { page: 'commands', section: 'Business', key: 'feature.antispam', label: 'Anti Spam', kind: 'toggle', scope: 'chat', description: 'Remove spammy users in a chat.' },
  { page: 'commands', section: 'Business', key: 'feature.antibadword', label: 'Anti Bad Word', kind: 'toggle', scope: 'chat', description: 'Delete bad-word messages.' },
  { page: 'commands', section: 'Business', key: 'feature.antibot', label: 'Anti Bot', kind: 'toggle', scope: 'chat', description: 'Block bot-like accounts in a chat.' },
  { page: 'commands', section: 'Business', key: 'autobio', label: 'Auto Bio', kind: 'toggle', scope: 'user', description: 'Keep the profile bio updated.' },
  { page: 'commands', section: 'Business', key: 'autoread', label: 'Auto Read', kind: 'toggle', scope: 'user', description: 'Auto mark messages as read.' },
  { page: 'commands', section: 'Business', key: 'autoViewStatus', label: 'Auto View Status', kind: 'toggle', scope: 'user', description: 'Auto view WhatsApp status updates.' },
  { page: 'groups', section: 'Group Controls', key: 'welcome', label: 'Welcome', kind: 'toggle', scope: 'chat', description: 'Join and leave notices for a group.' },
  { page: 'groups', section: 'Group Controls', key: 'autoReact', label: 'Auto React', kind: 'toggle', scope: 'chat', description: 'React to messages in a group.' },
  { page: 'groups', section: 'Group Controls', key: 'autoTyping', label: 'Auto Typing', kind: 'toggle', scope: 'chat', description: 'Show typing state in a group.' },
  { page: 'groups', section: 'Group Controls', key: 'autoRecording', kind: 'toggle', scope: 'chat', description: 'Show recording state in a group.' },
  { page: 'groups', section: 'Group Controls', key: 'autoRecordType', label: 'Auto Record Type', kind: 'toggle', scope: 'chat', description: 'Show typed audio state in a group.' },
  { page: 'groups', section: 'Group Controls', key: 'antilink', label: 'Anti Link', kind: 'toggle', scope: 'chat', description: 'Block WhatsApp invite links in a group.' },
  { page: 'business', section: 'Chat Automation', key: 'feature.autoreply', label: 'Auto Reply', kind: 'toggle', scope: 'chat', description: 'Reply automatically to matched text.' },
  { page: 'business', section: 'Chat Automation', key: 'feature.antispam', label: 'Anti Spam', kind: 'toggle', scope: 'chat', description: 'Remove spammy users in a chat.' },
  { page: 'business', section: 'Chat Automation', key: 'feature.antibadword', label: 'Anti Bad Word', kind: 'toggle', scope: 'chat', description: 'Delete bad-word messages.' },
  { page: 'business', section: 'Chat Automation', key: 'feature.antibot', label: 'Anti Bot', kind: 'toggle', scope: 'chat', description: 'Block bot-like accounts in a chat.' },
  { page: 'business', section: 'Personal Automation', key: 'autobio', label: 'Auto Bio', kind: 'toggle', scope: 'user', description: 'Keep the profile bio updated.' },
  { page: 'business', section: 'Personal Automation', key: 'autoread', label: 'Auto Read', kind: 'toggle', scope: 'user', description: 'Auto mark messages as read.' },
  { page: 'business', section: 'Personal Automation', key: 'autoViewStatus', label: 'Auto View Status', kind: 'toggle', scope: 'user', description: 'Auto view WhatsApp status updates.' }
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

module.exports = { NAV, CONTROL_CATALOG, COMMAND_GUIDES };
