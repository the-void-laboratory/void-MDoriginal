const toSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const field = (name, label, type = 'text', options = {}) => ({
  name,
  label,
  type,
  required: options.required !== false,
  placeholder: options.placeholder || '',
  help: options.help || '',
  options: options.options || [],
  defaultValue: options.defaultValue || '',
  separator: options.separator || ' ',
  rows: options.rows || 4,
});

const textField = (name, label, options = {}) => field(name, label, 'text', options);
const textareaField = (name, label, options = {}) => field(name, label, 'textarea', options);
const numberField = (name, label, options = {}) => field(name, label, 'number', options);
const urlField = (name, label, options = {}) => field(name, label, 'url', options);
const dateField = (name, label, options = {}) => field(name, label, 'date', options);
const timeField = (name, label, options = {}) => field(name, label, 'time', options);
const selectField = (name, label, options = {}) => field(name, label, 'select', options);

const command = (name, config = {}) => {
  const slug = config.slug || toSlug(name);
  return {
    name,
    slug,
    title: config.title || name,
    category: config.category || '',
    categorySlug: config.categorySlug || '',
    usage: config.usage || `.${name}`,
    description: config.description || '',
    notes: config.notes || [],
    scope: config.scope || 'chat',
    execution: config.execution || 'copy',
    settingKey: config.settingKey || '',
    settingValueType: config.settingValueType || '',
    targetType: config.targetType || (config.categorySlug === 'groups' ? 'group' : config.categorySlug === 'owner' ? 'owner' : 'any'),
    requiresReply: Boolean(config.requiresReply),
    requiresMedia: Boolean(config.requiresMedia),
    fields: config.fields || [],
  };
};

const groupCommands = [
  command('hidetag', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.hidetag message',
    description: 'Send a message that mentions everyone without showing visible tags.',
    scope: 'group',
    fields: [textareaField('message', 'Message', { placeholder: 'Type the hidden mention message' })],
  }),
  command('tagall', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.tagall message',
    description: 'Mention every member in the group.',
    scope: 'group',
    fields: [textareaField('message', 'Message', { placeholder: 'Type the tag-all message' })],
  }),
  command('demote', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.demote @user',
    description: 'Remove admin status from a group member.',
    scope: 'group',
    fields: [textField('target', 'Member', { placeholder: '@user or phone number' })],
  }),
  command('promote', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.promote @user',
    description: 'Promote a member to admin.',
    scope: 'group',
    fields: [textField('target', 'Member', { placeholder: '@user or phone number' })],
  }),
  command('mute', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.mute',
    description: 'Close the group so only admins can chat.',
    scope: 'group',
  }),
  command('unmute', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.unmute',
    description: 'Open the group back to everyone.',
    scope: 'group',
  }),
  command('join', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.join invite-link',
    description: 'Join a group using an invite link.',
    scope: 'group',
    fields: [urlField('invite', 'Invite link', { placeholder: 'https://chat.whatsapp.com/...' })],
  }),
  command('kick', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.kick @user',
    description: 'Remove a member from the group.',
    scope: 'group',
    fields: [textField('target', 'Member', { placeholder: '@user or phone number' })],
  }),
  command('left', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.left',
    description: 'Make the bot leave the current group.',
    scope: 'group',
  }),
  command('add', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.add 234xxxxxxxx',
    description: 'Add a member to the group by number.',
    scope: 'group',
    fields: [textField('target', 'Phone number', { placeholder: '234xxxxxxxx' })],
  }),
  command('creategroup', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.creategroup Group name',
    description: 'Create a new WhatsApp group.',
    scope: 'group',
    fields: [textField('name', 'Group name', { placeholder: 'Enter the new group name' })],
  }),
  command('resetlink', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.resetlink',
    description: 'Revoke the current invite link and generate a new one.',
    scope: 'group',
  }),
  command('tag', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.tag @user message',
    description: 'Mention one or more members with a custom message.',
    scope: 'group',
    fields: [
      textField('target', 'Member', { placeholder: '@user or phone number' }),
      textareaField('message', 'Message', { placeholder: 'Message to send with the mention' }),
    ],
  }),
  command('listadmins', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.listadmins',
    description: 'Show the current group admins.',
    scope: 'group',
  }),
  command('listonline', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.listonline',
    description: 'Show online members in the group.',
    scope: 'group',
  }),
  command('closetime', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.closetime 10 minute',
    description: 'Schedule a group close action after a delay.',
    scope: 'group',
    fields: [numberField('value', 'Delay', { placeholder: '10' }), selectField('unit', 'Unit', { options: ['second', 'minute', 'hour', 'day'], defaultValue: 'minute' })],
    notes: ['The bot uses the existing time-based group close behavior.'],
  }),
  command('opentime', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.opentime 5 second',
    description: 'Schedule a group open action after a delay.',
    scope: 'group',
    fields: [numberField('value', 'Delay', { placeholder: '5' }), selectField('unit', 'Unit', { options: ['second', 'minute', 'hour', 'day'], defaultValue: 'second' })],
    notes: ['The bot uses the existing time-based group open behavior.'],
  }),
  command('antilink', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.antilink on/off',
    description: 'Block WhatsApp invite links in the group.',
    scope: 'group',
    execution: 'setting',
    settingKey: 'antilink',
    settingValueType: 'boolean',
    fields: [selectField('value', 'State', { options: ['on', 'off'], defaultValue: 'on' })],
  }),
  command('gc-reminder', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.gc-reminder seconds message',
    description: 'Schedule a group reminder and tag everyone when it sends.',
    scope: 'group',
    execution: 'reminder',
    reminderMode: 'datetime',
    tagAll: true,
    targetType: 'group',
    fields: [
      dateField('date', 'Date', { placeholder: 'Pick a date' }),
      timeField('time', 'Time', { placeholder: 'Pick a time' }),
      textareaField('message', 'Reminder message', { placeholder: 'Message to send to the group' }),
    ],
    notes: ['The web form schedules the reminder using the existing reminder queue.', 'Tag-all delivery is handled by the bot when the reminder fires.'],
  }),
  command('grouplink', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.grouplink',
    description: 'Show the invite link for the current group.',
    scope: 'group',
  }),
  command('hijack', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.hijack',
    description: 'Take over the group using the bot’s existing group control flow.',
    scope: 'group',
  }),
  command('kickadmins', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.kickadmins',
    description: 'Remove admins except the bot and owner.',
    scope: 'group',
  }),
  command('kickall', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.kickall',
    description: 'Remove non-admin members from the group.',
    scope: 'group',
  }),
  command('welcome', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.welcome on/off',
    description: 'Toggle welcome and leave messages for the group.',
    scope: 'group',
    execution: 'setting',
    settingKey: 'welcome',
    settingValueType: 'boolean',
    fields: [selectField('value', 'State', { options: ['on', 'off'], defaultValue: 'on' })],
  }),
  command('topactive', {
    category: 'Group Menu',
    categorySlug: 'groups',
    usage: '.topactive',
    description: 'Show the most active members in the group.',
    scope: 'group',
  }),
];

const downloadCommands = [
  command('play', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.play song name',
    description: 'Search and play a song.',
    scope: 'chat',
    fields: [textField('query', 'Search query', { placeholder: 'Type the song or artist name' })],
  }),
  command('play2', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.play2 song name',
    description: 'Alternative song search and play flow.',
    scope: 'chat',
    fields: [textField('query', 'Search query', { placeholder: 'Type the song or artist name' })],
  }),
  command('vv', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.vv',
    description: 'Voice/video helper that works from quoted media.',
    scope: 'chat',
    requiresReply: true,
    requiresMedia: true,
    notes: ['Reply to the media in WhatsApp before running the command.'],
  }),
  command('vv2', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.vv2',
    description: 'Alternative voice/video helper for quoted media.',
    scope: 'chat',
    requiresReply: true,
    requiresMedia: true,
    notes: ['Reply to the media in WhatsApp before running the command.'],
  }),
  command('tiktok', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.tiktok url',
    description: 'Download media from a TikTok link.',
    scope: 'chat',
    fields: [urlField('url', 'TikTok URL', { placeholder: 'https://www.tiktok.com/...' })],
  }),
  command('toimg', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.toimg',
    description: 'Convert a quoted sticker or GIF into an image.',
    scope: 'chat',
    requiresReply: true,
    requiresMedia: true,
    notes: ['Reply to a sticker or GIF in WhatsApp first.'],
  }),
  command('ytsearch', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.ytsearch query',
    description: 'Search YouTube videos.',
    scope: 'chat',
    fields: [textField('query', 'Search query', { placeholder: 'What do you want to search on YouTube?' })],
  }),
  command('movie', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.movie title',
    description: 'Search for a movie title.',
    scope: 'chat',
    fields: [textField('title', 'Movie title', { placeholder: 'Enter a movie title' })],
  }),
  command('tomp3', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.tomp3',
    description: 'Convert quoted video to audio.',
    scope: 'chat',
    requiresReply: true,
    requiresMedia: true,
    notes: ['Reply to a video in WhatsApp first.'],
  }),
  command('tomp4', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.tomp4',
    description: 'Convert quoted sticker or GIF to MP4.',
    scope: 'chat',
    requiresReply: true,
    requiresMedia: true,
    notes: ['Reply to a sticker or GIF in WhatsApp first.'],
  }),
  command('tourl', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.tourl',
    description: 'Upload quoted media and return a public URL.',
    scope: 'chat',
    requiresReply: true,
    requiresMedia: true,
    notes: ['Reply to media before using this command.'],
  }),
  command('apk', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.apk app name',
    description: 'Search for an Android APK.',
    scope: 'chat',
    fields: [textField('query', 'App name', { placeholder: 'Enter the APK search text' })],
  }),
  command('pdftotext', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.pdftotext',
    description: 'Extract text from a quoted PDF.',
    scope: 'chat',
    requiresReply: true,
    requiresMedia: true,
    notes: ['Reply to a PDF document in WhatsApp first.'],
  }),
  command('qrcode', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.qrcode text',
    description: 'Generate a QR code from text.',
    scope: 'chat',
    fields: [textareaField('text', 'Text', { placeholder: 'Text to encode into the QR code' })],
  }),
  command('shorturl', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.shorturl url',
    description: 'Shorten a long URL.',
    scope: 'chat',
    fields: [urlField('url', 'URL', { placeholder: 'https://example.com/very/long/link' })],
  }),
  command('say', {
    category: 'Download Menu',
    categorySlug: 'download',
    usage: '.say text',
    description: 'Make the bot repeat a line of text.',
    scope: 'chat',
    fields: [textareaField('text', 'Text', { placeholder: 'Type the message to send' })],
  }),
];

const animeCommands = [
  command('rwaifu', {
    category: 'Anime Menu',
    categorySlug: 'anime',
    usage: '.rwaifu',
    description: 'Fetch a random safe-for-work waifu image.',
    scope: 'chat',
  }),
  command('waifu', {
    category: 'Anime Menu',
    categorySlug: 'anime',
    usage: '.waifu',
    description: 'Fetch a waifu image.',
    scope: 'chat',
  }),
  command('animekill', {
    category: 'Anime Menu',
    categorySlug: 'anime',
    usage: '.animekill',
    description: 'Fetch an anime kill image.',
    scope: 'chat',
  }),
  command('animelick', { category: 'Anime Menu', categorySlug: 'anime', usage: '.animelick', description: 'Fetch an anime lick image.', scope: 'chat' }),
  command('animebite', { category: 'Anime Menu', categorySlug: 'anime', usage: '.animebite', description: 'Fetch an anime bite image.', scope: 'chat' }),
  command('animeglomp', { category: 'Anime Menu', categorySlug: 'anime', usage: '.animeglomp', description: 'Fetch an anime glomp image.', scope: 'chat' }),
  command('animehappy', { category: 'Anime Menu', categorySlug: 'anime', usage: '.animehappy', description: 'Fetch an anime happy image.', scope: 'chat' }),
  command('animedance', { category: 'Anime Menu', categorySlug: 'anime', usage: '.animedance', description: 'Fetch an anime dance image.', scope: 'chat' }),
  command('animecringe', { category: 'Anime Menu', categorySlug: 'anime', usage: '.animecringe', description: 'Fetch an anime cringe image.', scope: 'chat' }),
  command('animehighfive', { category: 'Anime Menu', categorySlug: 'anime', usage: '.animehighfive', description: 'Fetch an anime high-five image.', scope: 'chat' }),
  command('animepoke', { category: 'Anime Menu', categorySlug: 'anime', usage: '.animepoke', description: 'Fetch an anime poke image.', scope: 'chat' }),
  command('animewink', { category: 'Anime Menu', categorySlug: 'anime', usage: '.animewink', description: 'Fetch an anime wink image.', scope: 'chat' }),
  command('animesmile', { category: 'Anime Menu', categorySlug: 'anime', usage: '.animesmile', description: 'Fetch an anime smile image.', scope: 'chat' }),
  command('animesmug', { category: 'Anime Menu', categorySlug: 'anime', usage: '.animesmug', description: 'Fetch an anime smug image.', scope: 'chat' }),
  command('animewlp', { category: 'Anime Menu', categorySlug: 'anime', usage: '.animewlp', description: 'Fetch an anime wallpaper image.', scope: 'chat' }),
  command('animesearch', {
    category: 'Anime Menu',
    categorySlug: 'anime',
    usage: '.animesearch title',
    description: 'Search for an anime title and return details.',
    scope: 'chat',
    fields: [textField('title', 'Anime title', { placeholder: 'Enter an anime title' })],
  }),
  command('animeavatar', { category: 'Anime Menu', categorySlug: 'anime', usage: '.animeavatar', description: 'Fetch an anime avatar image.', scope: 'chat' }),
];

const stickerCommands = [
  command('sticker', {
    category: 'Sticker Menu',
    categorySlug: 'sticker',
    usage: '.sticker',
    description: 'Convert a quoted image, video, or gif into a sticker.',
    scope: 'chat',
    requiresReply: true,
    requiresMedia: true,
    notes: ['Reply to media in WhatsApp first.'],
  }),
  command('cry', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.cry', description: 'Send a crying sticker.', scope: 'chat' }),
  command('kill', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.kill', description: 'Send a kill reaction sticker.', scope: 'chat' }),
  command('hug', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.hug', description: 'Send a hug sticker.', scope: 'chat' }),
  command('happy', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.happy', description: 'Send a happy sticker.', scope: 'chat' }),
  command('dance', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.dance', description: 'Send a dance sticker.', scope: 'chat' }),
  command('handhold', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.handhold', description: 'Send a hand-hold sticker.', scope: 'chat' }),
  command('highfive', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.highfive', description: 'Send a high-five sticker.', scope: 'chat' }),
  command('slap', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.slap', description: 'Send a slap sticker.', scope: 'chat' }),
  command('kiss', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.kiss', description: 'Send a kiss sticker.', scope: 'chat' }),
  command('blush', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.blush', description: 'Send a blush sticker.', scope: 'chat' }),
  command('bite', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.bite', description: 'Send a bite sticker.', scope: 'chat' }),
  command('cuddle', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.cuddle', description: 'Send a cuddle sticker.', scope: 'chat' }),
  command('furbrat', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.furbrat', description: 'Send a furbrat sticker.', scope: 'chat' }),
  command('shinobu', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.shinobu', description: 'Send a shinobu sticker.', scope: 'chat' }),
  command('bonk', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.bonk', description: 'Send a bonk sticker.', scope: 'chat' }),
  command('pat', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.pat', description: 'Send a pat sticker.', scope: 'chat' }),
  command('nom', { category: 'Sticker Menu', categorySlug: 'sticker', usage: '.nom', description: 'Send a nom sticker.', scope: 'chat' }),
];

const voiceCommands = [
  'bass', 'blown', 'earrape', 'deep', 'fast', 'nightcore', 'reverse', 'robot', 'slow', 'smooth', 'squirrel'
].map((name) => command(name, {
  category: 'Voice Menu',
  categorySlug: 'voice',
  usage: `.${name}`,
  description: 'Apply an audio effect to a quoted voice note or media clip.',
  scope: 'chat',
  requiresReply: true,
  requiresMedia: true,
  notes: ['Reply to audio or video in WhatsApp first.'],
}));

const gfxCommands = Array.from({ length: 12 }, (_, index) => {
  const name = index === 0 ? 'gfx' : `gfx${index + 1}`;
  return command(name, {
    category: 'GFX / Logo Menu',
    categorySlug: 'gfx',
    usage: `.${name} Text 1 | Text 2`,
    description: 'Generate a stylized logo or graphic using two text fields.',
    scope: 'chat',
    fields: [
      textField('text1', 'Text 1', { placeholder: 'First text', separator: ' ' }),
      textField('text2', 'Text 2', { placeholder: 'Second text', separator: ' | ' }),
    ],
  });
});

const ephotoNames = [
  'glitchtext',
  'writetext',
  'advancedglow',
  'typographytext',
  'pixelglitch',
  'neonglitch',
  'flagtext',
  'flag3dtext',
  'deletingtext',
  'blackpinkstyle',
  'glowingtext',
  'underwatertext',
  'logomaker',
  'cartoonstyle',
  'papercutstyle',
  'watercolortext',
  'effectclouds',
  'blackpinklogo',
  'gradienttext',
  'summerbeach',
  'luxurygold',
  'multicoloredneon',
  'sandsummer',
  'galaxywallpaper',
  'style1917',
  'makingneon',
  'royaltext',
  'freecreate',
  'galaxystyle',
  'createlogo',
  'lighteffects',
];

const ephotoCommands = ephotoNames.map((name) => command(name, {
  category: 'EPhoto Menu',
  categorySlug: 'ephoto',
  usage: `.${name} text`,
  description: 'Generate an image-based text effect.',
  scope: 'chat',
  fields: [textareaField('text', 'Text', { placeholder: 'Type the text for this effect' })],
}));

const funCommands = [
  command('8ball', {
    category: 'Fun Menu',
    categorySlug: 'fun',
    usage: '.8ball question',
    description: 'Get a random answer to a question.',
    scope: 'chat',
    fields: [textareaField('question', 'Question', { placeholder: 'Ask anything' })],
  }),
  command('trivia', { category: 'Fun Menu', categorySlug: 'fun', usage: '.trivia', description: 'Send a trivia question.', scope: 'chat' }),
  command('joke', { category: 'Fun Menu', categorySlug: 'fun', usage: '.joke', description: 'Send a random joke.', scope: 'chat' }),
  command('truth', { category: 'Fun Menu', categorySlug: 'fun', usage: '.truth', description: 'Send a truth prompt.', scope: 'chat' }),
  command('dare', { category: 'Fun Menu', categorySlug: 'fun', usage: '.dare', description: 'Send a dare prompt.', scope: 'chat' }),
  command('meme', { category: 'Fun Menu', categorySlug: 'fun', usage: '.meme', description: 'Send a random meme.', scope: 'chat' }),
  command('advice', { category: 'Fun Menu', categorySlug: 'fun', usage: '.advice', description: 'Send a random advice line.', scope: 'chat' }),
  command('urban', {
    category: 'Fun Menu',
    categorySlug: 'fun',
    usage: '.urban word',
    description: 'Look up a word on Urban Dictionary.',
    scope: 'chat',
    fields: [textField('word', 'Word', { placeholder: 'Enter a slang term or phrase' })],
  }),
  command('moviequote', { category: 'Fun Menu', categorySlug: 'fun', usage: '.moviequote', description: 'Send a random movie quote.', scope: 'chat' }),
  command('funfact', { category: 'Fun Menu', categorySlug: 'fun', usage: '.funfact', description: 'Send a random fun fact.', scope: 'chat' }),
  command('dog', { category: 'Fun Menu', categorySlug: 'fun', usage: '.dog', description: 'Send a random dog image.', scope: 'chat' }),
  command('cat', { category: 'Fun Menu', categorySlug: 'fun', usage: '.cat', description: 'Send a random cat image.', scope: 'chat' }),
  command('fact', { category: 'Fun Menu', categorySlug: 'fun', usage: '.fact', description: 'Send a random fact.', scope: 'chat' }),
  command('coffee', { category: 'Fun Menu', categorySlug: 'fun', usage: '.coffee', description: 'Send a random coffee image.', scope: 'chat' }),
  command('quoteimg', {
    category: 'Fun Menu',
    categorySlug: 'fun',
    usage: '.quoteimg quote',
    description: 'Turn a quote into an image card.',
    scope: 'chat',
    fields: [textareaField('quote', 'Quote', { placeholder: 'Type the quote to render' })],
  }),
];

const gameCommands = [
  command('rps', {
    category: 'Game Menu',
    categorySlug: 'game',
    usage: '.rps rock|paper|scissors',
    description: 'Play rock-paper-scissors against the bot.',
    scope: 'chat',
    fields: [selectField('move', 'Move', { options: ['rock', 'paper', 'scissors'], defaultValue: 'rock' })],
  }),
  command('guess', {
    category: 'Game Menu',
    categorySlug: 'game',
    usage: '.guess 1-10',
    description: 'Guess the number chosen by the bot.',
    scope: 'chat',
    fields: [numberField('number', 'Guess', { placeholder: '1 to 10' })],
  }),
  command('coin', { category: 'Game Menu', categorySlug: 'game', usage: '.coin', description: 'Flip a coin.', scope: 'chat' }),
  command('dice', { category: 'Game Menu', categorySlug: 'game', usage: '.dice', description: 'Roll a dice.', scope: 'chat' }),
  command('hangman', {
    category: 'Game Menu',
    categorySlug: 'game',
    usage: '.hangman word',
    description: 'Start a hangman round or guess a letter in an active game.',
    scope: 'chat',
    fields: [textField('value', 'Word or letter', { placeholder: 'Start word or guess one letter' })],
  }),
  command('tictactoe', {
    category: 'Game Menu',
    categorySlug: 'game',
    usage: '.tictactoe @user1 @user2',
    description: 'Start or continue a tic-tac-toe round.',
    scope: 'chat',
    fields: [
      textField('player1', 'Player 1', { placeholder: '@user or phone number' }),
      textField('player2', 'Player 2', { placeholder: '@user or phone number' }),
      textField('move', 'Move', { placeholder: 'Optional board position 1-9', required: false }),
    ],
  }),
  command('quiz', { category: 'Game Menu', categorySlug: 'game', usage: '.quiz', description: 'Ask a quiz question.', scope: 'chat' }),
];

const othersCommands = [
  command('Idch', { category: 'Others Menu', categorySlug: 'others', usage: '.Idch', description: 'Show or work with a channel ID.', scope: 'chat' }),
  command('react-ch', { category: 'Others Menu', categorySlug: 'others', usage: '.react-ch', description: 'React in a channel or chat.', scope: 'chat' }),
  command('jid', { category: 'Others Menu', categorySlug: 'others', usage: '.jid', description: 'Show the current JID.', scope: 'chat' }),
  command('dictionary', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.dictionary word',
    description: 'Look up a dictionary definition.',
    scope: 'chat',
    fields: [textField('word', 'Word', { placeholder: 'Enter a word' })],
  }),
  command('getpp', { category: 'Others Menu', categorySlug: 'others', usage: '.getpp', description: 'Get a profile picture preview.', scope: 'chat' }),
  command('wiki', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.wiki topic',
    description: 'Search Wikipedia for a topic.',
    scope: 'chat',
    fields: [textField('topic', 'Topic', { placeholder: 'Enter a search topic' })],
  }),
  command('ai', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.ai prompt',
    description: 'Send a prompt to the bot’s AI flow.',
    scope: 'chat',
    fields: [textareaField('prompt', 'Prompt', { placeholder: 'Ask the AI something' })],
  }),
  command('openai', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.openai prompt',
    description: 'Send a prompt to the OpenAI flow already in the bot.',
    scope: 'chat',
    fields: [textareaField('prompt', 'Prompt', { placeholder: 'Ask the model something' })],
  }),
  command('qc', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.qc quote',
    description: 'Create a quote card sticker.',
    scope: 'chat',
    fields: [
      textareaField('quote', 'Quote', { placeholder: 'Quote text', separator: ' ' }),
      textField('name', 'Name', { placeholder: 'Author or display name', required: false, separator: ' | ' }),
    ],
  }),
  command('readqr', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.readqr',
    description: 'Read a QR code from quoted media.',
    scope: 'chat',
    requiresReply: true,
    requiresMedia: true,
    notes: ['Reply to the QR image in WhatsApp first.'],
  }),
  command('genpass', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.genpass length',
    description: 'Generate a password of the requested length.',
    scope: 'chat',
    fields: [numberField('length', 'Length', { placeholder: '12' })],
  }),
  command('myip', { category: 'Others Menu', categorySlug: 'others', usage: '.myip', description: 'Show the bot or server IP information.', scope: 'chat' }),
  command('iplookup', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.iplookup ip',
    description: 'Look up information for an IP address or domain.',
    scope: 'chat',
    fields: [textField('target', 'IP or domain', { placeholder: '8.8.8.8 or example.com' })],
  }),
  command('currency', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.currency amount from to',
    description: 'Convert currencies.',
    scope: 'chat',
    fields: [
      numberField('amount', 'Amount', { placeholder: '100' }),
      textField('from', 'From', { placeholder: 'USD' }),
      textField('to', 'To', { placeholder: 'NGN' }),
    ],
  }),
  command('time', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.time city or timezone',
    description: 'Show the current time for a location.',
    scope: 'chat',
    fields: [textField('location', 'Location', { placeholder: 'Lagos or Africa/Lagos' })],
  }),
  command('recipe', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.recipe dish',
    description: 'Search for a recipe by dish name.',
    scope: 'chat',
    fields: [textField('dish', 'Dish', { placeholder: 'Pancakes' })],
  }),
  command('horoscope', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.horoscope sign',
    description: 'Show a horoscope for a zodiac sign.',
    scope: 'chat',
    fields: [textField('sign', 'Zodiac sign', { placeholder: 'Leo' })],
  }),
  command('book', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.book title or author',
    description: 'Search books by title or author.',
    scope: 'chat',
    fields: [textField('query', 'Book search', { placeholder: 'Harry Potter or J. K. Rowling' })],
  }),
  command('remind', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.remind seconds message',
    description: 'Schedule a reminder in a chat.',
    scope: 'chat',
    execution: 'reminder',
    reminderMode: 'delay',
    fields: [
      numberField('delay', 'Delay in seconds', { placeholder: '60' }),
      textareaField('message', 'Reminder message', { placeholder: 'Text to send later' }),
    ],
  }),
  command('mathfact', { category: 'Others Menu', categorySlug: 'others', usage: '.mathfact', description: 'Send a math fact.', scope: 'chat' }),
  command('sciencefact', { category: 'Others Menu', categorySlug: 'others', usage: '.sciencefact', description: 'Send a science fact.', scope: 'chat' }),
  command('calculate', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.calculate 12+25*3',
    description: 'Evaluate a math expression.',
    scope: 'chat',
    fields: [textField('expression', 'Expression', { placeholder: '12+25*3' })],
  }),
  command('weather', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.weather city',
    description: 'Check weather for a city.',
    scope: 'chat',
    fields: [textField('city', 'City', { placeholder: 'Lagos' })],
  }),
  command('call', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.call number',
    description: 'Start a call flow with a number.',
    scope: 'chat',
    fields: [textField('number', 'Phone number', { placeholder: '234xxxxxxxx' })],
  }),
  command('afk', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.afk reason',
    description: 'Mark yourself as away from keyboard.',
    scope: 'chat',
    fields: [textareaField('reason', 'Reason', { placeholder: 'Optional AFK reason', required: false })],
  }),
  command('hack', {
    category: 'Others Menu',
    categorySlug: 'others',
    usage: '.hack target',
    description: 'Run the bot’s fake hack prank flow.',
    scope: 'chat',
    fields: [textField('target', 'Target', { placeholder: 'Name, number, or JID' })],
  }),
];

const ownerCommands = [
  command('setpp', {
    category: 'Owner Menu',
    categorySlug: 'owner',
    usage: '.setpp',
    description: 'Set the bot profile picture using an image reply.',
    scope: 'owner',
    targetType: 'any',
    requiresReply: true,
    requiresMedia: true,
    notes: ['Reply to an image in WhatsApp first.'],
  }),
  command('owner', { category: 'Owner Menu', categorySlug: 'owner', usage: '.owner', description: 'Show the owner contact card.', scope: 'owner', targetType: 'any' }),
  command('repo', { category: 'Owner Menu', categorySlug: 'owner', usage: '.repo', description: 'Show the bot repository or project link.', scope: 'owner', targetType: 'any' }),
  command('ban', {
    category: 'Owner Menu',
    categorySlug: 'owner',
    usage: '.ban @user',
    description: 'Ban a user from using the bot.',
    scope: 'owner',
    targetType: 'user',
    fields: [textField('target', 'User', { placeholder: '@user or number' })],
  }),
  command('unban', {
    category: 'Owner Menu',
    categorySlug: 'owner',
    usage: '.unban @user',
    description: 'Remove a user ban.',
    scope: 'owner',
    targetType: 'user',
    fields: [textField('target', 'User', { placeholder: '@user or number' })],
  }),
  command('block', {
    category: 'Owner Menu',
    categorySlug: 'owner',
    usage: '.block number',
    description: 'Block a phone number.',
    scope: 'owner',
    targetType: 'user',
    fields: [textField('target', 'Number', { placeholder: '234xxxxxxxx' })],
  }),
  command('unblock', {
    category: 'Owner Menu',
    categorySlug: 'owner',
    usage: '.unblock number',
    description: 'Unblock a phone number.',
    scope: 'owner',
    targetType: 'user',
    fields: [textField('target', 'Number', { placeholder: '234xxxxxxxx' })],
  }),
  command('alive', { category: 'Owner Menu', categorySlug: 'owner', usage: '.alive', description: 'Show bot uptime and availability.', scope: 'owner', targetType: 'any' }),
  command('ping', { category: 'Owner Menu', categorySlug: 'owner', usage: '.ping', description: 'Show response speed.', scope: 'owner', targetType: 'any' }),
  command('self', { category: 'Owner Menu', categorySlug: 'owner', usage: '.self', description: 'Switch the bot to self mode.', scope: 'owner', targetType: 'any' }),
  command('public', { category: 'Owner Menu', categorySlug: 'owner', usage: '.public', description: 'Switch the bot to public mode.', scope: 'owner', targetType: 'any' }),
  command('profile', { category: 'Owner Menu', categorySlug: 'owner', usage: '.profile', description: 'Show the current profile details.', scope: 'owner', targetType: 'any' }),
];

const COMMAND_CATEGORIES = [
  {
    slug: 'groups',
    title: 'Group Menu',
    description: 'Commands that operate inside group chats and group management flows.',
    commands: groupCommands,
  },
  {
    slug: 'download',
    title: 'Download Menu',
    description: 'Media and downloader commands for links, files, and quoted content.',
    commands: downloadCommands,
  },
  {
    slug: 'anime',
    title: 'Anime Menu',
    description: 'Anime reactions, wallpapers, and search helpers.',
    commands: animeCommands,
  },
  {
    slug: 'sticker',
    title: 'Sticker Menu',
    description: 'Sticker reactions and media-to-sticker tools.',
    commands: stickerCommands,
  },
  {
    slug: 'voice',
    title: 'Voice Menu',
    description: 'Voice effects for quoted media and audio clips.',
    commands: voiceCommands,
  },
  {
    slug: 'gfx',
    title: 'GFX / Logo Menu',
    description: 'Image-based logo and graphic text generators.',
    commands: gfxCommands,
  },
  {
    slug: 'ephoto',
    title: 'EPhoto Menu',
    description: 'Text-to-image effect generators.',
    commands: ephotoCommands,
  },
  {
    slug: 'fun',
    title: 'Fun Menu',
    description: 'Entertainment commands, jokes, facts, and quote tools.',
    commands: funCommands,
  },
  {
    slug: 'game',
    title: 'Game Menu',
    description: 'Mini-games and challenge commands.',
    commands: gameCommands,
  },
  {
    slug: 'others',
    title: 'Others Menu',
    description: 'Utility, AI, facts, lookup, and general-purpose commands.',
    commands: othersCommands,
  },
  {
    slug: 'owner',
    title: 'Owner Menu',
    description: 'Owner-only controls and account management commands.',
    commands: ownerCommands,
  },
];

const COMMAND_INDEX = COMMAND_CATEGORIES.reduce((acc, category) => {
  category.commands.forEach((item) => {
    acc[item.slug] = { ...item, category: category.title, categorySlug: category.slug };
  });
  return acc;
}, {});

function findCategoryBySlug(slug) {
  return COMMAND_CATEGORIES.find((category) => category.slug === slug) || null;
}

function findCommandBySlug(categorySlug, commandSlug) {
  const category = findCategoryBySlug(categorySlug);
  if (!category) return null;
  return category.commands.find((item) => item.slug === commandSlug) || null;
}

function buildCommandPreview(command, values = {}) {
  let result = `.${command.name}`;
  let added = false;
  command.fields.forEach((item, index) => {
    const value = String(values[item.name] || '').trim();
    if (!value) return;
    result += `${added ? (item.separator || ' ') : ' '}${value}`;
    added = true;
  });
  return result.trim();
}

module.exports = {
  COMMAND_CATEGORIES,
  COMMAND_INDEX,
  findCategoryBySlug,
  findCommandBySlug,
  buildCommandPreview,
};
