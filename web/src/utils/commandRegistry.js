/**
 * Command Registry
 * Central source of truth for all commands and their configurations
 */

export const CATEGORIES = {
  GROUP: { label: "❖ ɢʀᴏᴜᴘ ᴍᴇɴᴜ ❖", icon: "Users" },
  DOWNLOAD: { label: "❖ ᴅᴏᴡɴʟᴏᴀᴅ ᴍᴇɴᴜ ❖", icon: "Download" },
  ANIME: { label: "❖ ᴀɴɪᴍᴇ ᴍᴇɴᴜ ❖", icon: "Smile" },
  STICKER: { label: "❖ sᴛɪᴄᴋᴇʀ ᴍᴇɴᴜ ❖", icon: "Image" },
  VOICE: { label: "❖ ᴠᴏɪᴄᴇ ᴍᴇɴᴜ ❖", icon: "Mic" },
  GFX: { label: "❖ ɢғx / ʟᴏɢᴏ ᴍᴇɴᴜ ❖", icon: "PenTool" },
  EPHOTO: { label: "❖ ᴇᴘʜᴏᴛᴏ ᴍᴇɴᴜ ❖", icon: "Camera" },
  FUN: { label: "❖ ꜰᴜɴ ᴍᴇɴᴜ ❖", icon: "Frown" },
  GAME: { label: "❖ ɢᴀᴍᴇ ᴍᴇɴᴜ ❖", icon: "Gamepad" },
  OTHERS: { label: "❖ ᴏᴛʜᴇʀs ᴍᴇɴᴜ ❖", icon: "MoreHorizontal" },
  OWNER: { label: "❖ ᴏᴡɴᴇʀ ᴍᴇɴᴜ ❖", icon: "Shield" },
};

/**
 * Command definitions with full metadata
 * Each command specifies its own page/modal type and inputs
 */
export const COMMAND_REGISTRY = {
  // ========== GROUP COMMANDS ==========
  welcome: {
    name: "welcome",
    category: "GROUP",
    description: "Set a custom welcome message for new group members",
    pageType: "custom",
    inputs: [
      {
        id: "message",
        label: "Welcome Message",
        type: "textarea",
        placeholder: "Hi @user, welcome to @group!\n\nAvailable variables: @user, @group, @members",
        required: true,
        hint: "Use @user for member name, @group for group name, @members for total count"
      }
    ]
  },

  antilink: {
    name: "antilink",
    category: "GROUP",
    description: "Configure anti-link settings for the group",
    pageType: "custom",
    inputs: [
      {
        id: "status",
        label: "Status",
        type: "select",
        options: ["on", "off"],
        required: true
      },
      {
        id: "action",
        label: "Action When Link Detected",
        type: "radio",
        options: ["kick", "delete", "warn", "mute"],
        default: "kick",
        required: true
      },
      {
        id: "whitelist",
        label: "Whitelisted Links (Optional)",
        type: "textarea",
        placeholder: "https://example.com\nhttps://trusted-site.com",
        required: false,
        hint: "One URL per line"
      },
      {
        id: "exempt-admins",
        label: "Exempt admins from anti-link rules",
        type: "checkbox",
        default: true
      }
    ]
  },

  hidetag: {
    name: "hidetag",
    category: "GROUP",
    description: "Send a hidden tag to all group members",
    pageType: "simple",
    inputs: []
  },

  tagall: {
    name: "tagall",
    category: "GROUP",
    description: "Tag all members in the group",
    pageType: "simple",
    inputs: []
  },

  demote: {
    name: "demote",
    category: "GROUP",
    description: "Remove admin privileges from a member",
    pageType: "simple",
    inputs: []
  },

  promote: {
    name: "promote",
    category: "GROUP",
    description: "Grant admin privileges to a member",
    pageType: "simple",
    inputs: []
  },

  mute: {
    name: "mute",
    category: "GROUP",
    description: "Mute the group (only admins can send messages)",
    pageType: "simple",
    inputs: []
  },

  unmute: {
    name: "unmute",
    category: "GROUP",
    description: "Unmute the group",
    pageType: "simple",
    inputs: []
  },

  kick: {
    name: "kick",
    category: "GROUP",
    description: "Remove a member from the group",
    pageType: "simple",
    inputs: []
  },

  add: {
    name: "add",
    category: "GROUP",
    description: "Add a member to the group",
    pageType: "simple",
    inputs: []
  },

  left: {
    name: "left",
    category: "GROUP",
    description: "Leave the group",
    pageType: "simple",
    inputs: []
  },

  creategroup: {
    name: "creategroup",
    category: "GROUP",
    description: "Create a new group",
    pageType: "simple",
    inputs: [{ id: "name", label: "Group Name", type: "text", required: true }]
  },

  resetlink: {
    name: "resetlink",
    category: "GROUP",
    description: "Reset the group invite link",
    pageType: "simple",
    inputs: []
  },

  tag: {
    name: "tag",
    category: "GROUP",
    description: "Tag all members in a quoted message",
    pageType: "simple",
    inputs: []
  },

  listadmins: {
    name: "listadmins",
    category: "GROUP",
    description: "List all group administrators",
    pageType: "simple",
    inputs: []
  },

  listonline: {
    name: "listonline",
    category: "GROUP",
    description: "List online group members",
    pageType: "simple",
    inputs: []
  },

  closetime: {
    name: "closetime",
    category: "GROUP",
    description: "Close the group for a set duration",
    pageType: "simple",
    inputs: [{ id: "duration", label: "Duration (minutes)", type: "text", required: true }]
  },

  opentime: {
    name: "opentime",
    category: "GROUP",
    description: "Reopen the group after closing",
    pageType: "simple",
    inputs: []
  },

  grouplink: {
    name: "grouplink",
    category: "GROUP",
    description: "Get the group invite link",
    pageType: "simple",
    inputs: []
  },

  hijack: {
    name: "hijack",
    category: "GROUP",
    description: "Take control of group settings",
    pageType: "simple",
    inputs: []
  },

  kickadmins: {
    name: "kickadmins",
    category: "GROUP",
    description: "Remove all admins from the group",
    pageType: "simple",
    inputs: []
  },

  kickall: {
    name: "kickall",
    category: "GROUP",
    description: "Remove all members from the group",
    pageType: "simple",
    inputs: []
  },

  topactive: {
    name: "topactive",
    category: "GROUP",
    description: "Show most active group members",
    pageType: "simple",
    inputs: []
  },

  // ========== DOWNLOAD COMMANDS ==========
  play: {
    name: "play",
    category: "DOWNLOAD",
    description: "Download music from YouTube",
    pageType: "simple",
    inputs: [{ id: "q", label: "Song/Artist", type: "text", required: true }]
  },

  tiktok: {
    name: "tiktok",
    category: "DOWNLOAD",
    description: "Download TikTok video",
    pageType: "simple",
    inputs: [{ id: "url", label: "TikTok Link", type: "text", required: true }]
  },

  ytsearch: {
    name: "ytsearch",
    category: "DOWNLOAD",
    description: "Search YouTube videos",
    pageType: "simple",
    inputs: [{ id: "q", label: "Search Query", type: "text", required: true }]
  },

  movie: {
    name: "movie",
    category: "DOWNLOAD",
    description: "Get movie information",
    pageType: "simple",
    inputs: [{ id: "q", label: "Movie Name", type: "text", required: true }]
  },

  apk: {
    name: "apk",
    category: "DOWNLOAD",
    description: "Download APK file",
    pageType: "simple",
    inputs: [{ id: "q", label: "Package Name", type: "text", required: true }]
  },

  qrcode: {
    name: "qrcode",
    category: "DOWNLOAD",
    description: "Generate QR code",
    pageType: "simple",
    inputs: [{ id: "text", label: "Text/URL", type: "text", required: true }]
  },

  shorturl: {
    name: "shorturl",
    category: "DOWNLOAD",
    description: "Shorten a URL",
    pageType: "simple",
    inputs: [{ id: "url", label: "URL", type: "text", required: true }]
  },

  say: {
    name: "say",
    category: "DOWNLOAD",
    description: "Convert text to speech",
    pageType: "simple",
    inputs: [{ id: "text", label: "Text", type: "textarea", required: true }]
  },

  vv: {
    name: "vv",
    category: "DOWNLOAD",
    description: "View once messages",
    pageType: "simple",
    inputs: []
  },

  toimg: {
    name: "toimg",
    category: "DOWNLOAD",
    description: "Convert sticker to image",
    pageType: "simple",
    inputs: []
  },

  tomp3: {
    name: "tomp3",
    category: "DOWNLOAD",
    description: "Convert video to MP3",
    pageType: "simple",
    inputs: []
  },

  tomp4: {
    name: "tomp4",
    category: "DOWNLOAD",
    description: "Convert sticker to video",
    pageType: "simple",
    inputs: []
  },

  // ========== FUN COMMANDS ==========
  joke: {
    name: "joke",
    category: "FUN",
    description: "Get a random joke",
    pageType: "simple",
    inputs: []
  },

  meme: {
    name: "meme",
    category: "FUN",
    description: "Get a random meme",
    pageType: "simple",
    inputs: []
  },

  trivia: {
    name: "trivia",
    category: "FUN",
    description: "Answer a trivia question",
    pageType: "simple",
    inputs: []
  },

  truth: {
    name: "truth",
    category: "FUN",
    description: "Get a truth question",
    pageType: "simple",
    inputs: []
  },

  dare: {
    name: "dare",
    category: "FUN",
    description: "Get a dare challenge",
    pageType: "simple",
    inputs: []
  },

  "8ball": {
    name: "8ball",
    category: "FUN",
    description: "Ask the magic 8 ball a question",
    pageType: "simple",
    inputs: [{ id: "q", label: "Your Question", type: "text", required: true }]
  },

  advice: {
    name: "advice",
    category: "FUN",
    description: "Get random advice",
    pageType: "simple",
    inputs: []
  },

  // ========== GAME COMMANDS ==========
  rps: {
    name: "rps",
    category: "GAME",
    description: "Play rock-paper-scissors",
    pageType: "simple",
    inputs: [{ id: "move", label: "Your Move", type: "select", options: ["rock", "paper", "scissors"], required: true }]
  },

  coin: {
    name: "coin",
    category: "GAME",
    description: "Flip a coin",
    pageType: "simple",
    inputs: []
  },

  dice: {
    name: "dice",
    category: "GAME",
    description: "Roll a dice",
    pageType: "simple",
    inputs: []
  },

  guess: {
    name: "guess",
    category: "GAME",
    description: "Guess a number",
    pageType: "simple",
    inputs: [{ id: "number", label: "Your Guess (1-10)", type: "text", required: true }]
  },

  hangman: {
    name: "hangman",
    category: "GAME",
    description: "Play hangman",
    pageType: "simple",
    inputs: []
  },

  tictactoe: {
    name: "tictactoe",
    category: "GAME",
    description: "Play tic-tac-toe",
    pageType: "simple",
    inputs: []
  },

  quiz: {
    name: "quiz",
    category: "GAME",
    description: "Answer a quiz question",
    pageType: "simple",
    inputs: []
  },

  // ========== OWNER COMMANDS ==========
  public: {
    name: "public",
    category: "OWNER",
    description: "Set bot to public mode",
    pageType: "simple",
    inputs: []
  },

  self: {
    name: "self",
    category: "OWNER",
    description: "Set bot to private mode",
    pageType: "simple",
    inputs: []
  },

  alive: {
    name: "alive",
    category: "OWNER",
    description: "Check bot uptime",
    pageType: "simple",
    inputs: []
  },

  ping: {
    name: "ping",
    category: "OWNER",
    description: "Check bot speed",
    pageType: "simple",
    inputs: []
  },
};

/**
 * Get a single command by name
 */
export function getCommand(name) {
  return COMMAND_REGISTRY[name];
}

/**
 * Get all commands in a category
 */
export function getCommandsByCategory(category) {
  return Object.values(COMMAND_REGISTRY).filter(cmd => cmd.category === category);
}

/**
 * Get all commands
 */
export function getAllCommands() {
  return Object.values(COMMAND_REGISTRY);
}

/**
 * Get all categories
 */
export function getAllCategories() {
  return Object.entries(CATEGORIES).map(([key, value]) => ({
    key,
    ...value
  }));
}
