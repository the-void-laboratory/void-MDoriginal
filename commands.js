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

export const ALL_COMMANDS = [
  // --- Group Menu ---
  { name: "hidetag", category: "GROUP" }, { name: "tagall", category: "GROUP" },
  { name: "demote", category: "GROUP" }, { name: "promote", category: "GROUP" },
  { name: "mute", category: "GROUP" }, { name: "unmute", category: "GROUP" },
  { name: "join", category: "GROUP" }, { name: "kick", category: "GROUP" },
  { name: "left", category: "GROUP" }, { name: "add", category: "GROUP" },
  { name: "creategroup", category: "GROUP" }, { name: "resetlink", category: "GROUP" },
  { name: "tag", category: "GROUP" }, { name: "listadmins", category: "GROUP" },
  { name: "listonline", category: "GROUP" }, { name: "closetime", category: "GROUP" },
  { name: "opentime", category: "GROUP" }, { name: "grouplink", category: "GROUP" },
  { name: "hijack", category: "GROUP" }, { name: "kickadmins", category: "GROUP" },
  { name: "kickall", category: "GROUP" }, { name: "topactive", category: "GROUP" },
  { name: "antilink", category: "GROUP", requiresInput: true, inputs: [
    { id: "status", label: "Status", type: "select", options: ["on", "off"] },
    { id: "action", label: "Action", type: "select", options: ["kick", "delete", "warn"] }
  ]},
  { name: "welcome", category: "GROUP", requiresInput: true, inputs: [
    { id: "message", label: "Welcome Message", type: "textarea", placeholder: "Hi @user, welcome to @group!" }
  ]},

  // --- Download Menu ---
  { name: "play", category: "DOWNLOAD", requiresInput: true, inputs: [{ id: "q", label: "Query", type: "text" }] },
  { name: "play2", category: "DOWNLOAD" }, { name: "vv", category: "DOWNLOAD" }, { name: "vv2", category: "DOWNLOAD" },
  { name: "tiktok", category: "DOWNLOAD", requiresInput: true, inputs: [{ id: "url", label: "Video URL", type: "text" }] },
  { name: "toimg", category: "DOWNLOAD" }, { name: "ytsearch", category: "DOWNLOAD", requiresInput: true, inputs: [{ id: "q", label: "Search Query", type: "text" }] },
  { name: "movie", category: "DOWNLOAD", requiresInput: true, inputs: [{ id: "q", label: "Movie Name", type: "text" }] },
  { name: "tomp3", category: "DOWNLOAD" }, { name: "tomp4", category: "DOWNLOAD" }, { name: "tourl", category: "DOWNLOAD" },
  { name: "apk", category: "DOWNLOAD", requiresInput: true, inputs: [{ id: "q", label: "App Name", type: "text" }] },
  { name: "pdftotext", category: "DOWNLOAD" }, { name: "qrcode", category: "DOWNLOAD" }, { name: "shorturl", category: "DOWNLOAD" },
  { name: "say", category: "DOWNLOAD", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },

  // --- Anime Menu ---
  { name: "rwaifu", category: "ANIME" }, { name: "waifu", category: "ANIME" }, { name: "animekill", category: "ANIME" },
  { name: "animelick", category: "ANIME" }, { name: "animebite", category: "ANIME" }, { name: "animeglomp", category: "ANIME" },
  { name: "animehappy", category: "ANIME" }, { name: "animedance", category: "ANIME" }, { name: "animecringe", category: "ANIME" },
  { name: "animehighfive", category: "ANIME" }, { name: "animepoke", category: "ANIME" }, { name: "animewink", category: "ANIME" },
  { name: "animesmile", category: "ANIME" }, { name: "animesmug", category: "ANIME" }, { name: "animewlp", category: "ANIME" },
  { name: "animesearch", category: "ANIME", requiresInput: true, inputs: [{ id: "q", label: "Anime Name", type: "text" }] },
  { name: "animeavatar", category: "ANIME" },

  // --- Sticker Menu ---
  { name: "sticker", category: "STICKER" }, { name: "cry", category: "STICKER" }, { name: "kill", category: "STICKER" },
  { name: "hug", category: "STICKER" }, { name: "happy", category: "STICKER" }, { name: "dance", category: "STICKER" },
  { name: "handhold", category: "STICKER" }, { name: "highfive", category: "STICKER" }, { name: "slap", category: "STICKER" },
  { name: "kiss", category: "STICKER" }, { name: "blush", category: "STICKER" }, { name: "bite", category: "STICKER" },
  { name: "cuddle", category: "STICKER" }, { name: "furbrat", category: "STICKER" }, { name: "shinobu", category: "STICKER" },
  { name: "bonk", category: "STICKER" }, { name: "pat", category: "STICKER" }, { name: "nom", category: "STICKER" },

  // --- Voice Menu ---
  { name: "bass", category: "VOICE" }, { name: "blown", category: "VOICE" }, { name: "earrape", category: "VOICE" },
  { name: "deep", category: "VOICE" }, { name: "fast", category: "VOICE" }, { name: "nightcore", category: "VOICE" },
  { name: "reverse", category: "VOICE" }, { name: "robot", category: "VOICE" }, { name: "slow", category: "VOICE" },
  { name: "smooth", category: "VOICE" }, { name: "squirrel", category: "VOICE" },

  // --- GFX / Logo Menu ---
  { name: "gfx", category: "GFX", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "gfx2", category: "GFX", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "gfx3", category: "GFX", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "gfx4", category: "GFX", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "gfx5", category: "GFX", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "gfx6", category: "GFX", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "gfx7", category: "GFX", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "gfx8", category: "GFX", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "gfx9", category: "GFX", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "gfx10", category: "GFX", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "gfx11", category: "GFX", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "gfx12", category: "GFX", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },

  // --- Ephoto Menu ---
  { name: "glitchtext", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "writetext", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "advancedglow", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "typographytext", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "pixelglitch", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "neonglitch", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "flagtext", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "flag3dtext", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "deletingtext", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "blackpinkstyle", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "glowingtext", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "underwatertext", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "logomaker", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "cartoonstyle", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "papercutstyle", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "watercolortext", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "effectclouds", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "blackpinklogo", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "gradienttext", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "summerbeach", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "luxurygold", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "multicoloredneon", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "sandsummer", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "galaxywallpaper", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "style1917", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "makingneon", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "royaltext", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "freecreate", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "galaxystyle", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "createlogo", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },
  { name: "lighteffects", category: "EPHOTO", requiresInput: true, inputs: [{ id: "text", label: "Text", type: "text" }] },

  // --- Fun Menu ---
  { name: "8ball", category: "FUN", requiresInput: true, inputs: [{ id: "q", label: "Your Question", type: "text" }] },
  { name: "trivia", category: "FUN" }, { name: "joke", category: "FUN" }, { name: "truth", category: "FUN" },
  { name: "dare", category: "FUN" }, { name: "meme", category: "FUN" }, { name: "advice", category: "FUN" },
  { name: "urban", category: "FUN", requiresInput: true, inputs: [{ id: "q", label: "Search Term", type: "text" }] },
  { name: "moviequote", category: "FUN" }, { name: "funfact", category: "FUN" }, { name: "dog", category: "FUN" },
  { name: "cat", category: "FUN" }, { name: "fact", category: "FUN" }, { name: "coffee", category: "FUN" },
  { name: "quoteimg", category: "FUN" },

  // --- Game Menu ---
  { name: "rps", category: "GAME", requiresInput: true, inputs: [{ id: "move", label: "Your Move", type: "select", options: ["rock", "paper", "scissors"] }] },
  { name: "guess", category: "GAME" }, { name: "coin", category: "GAME" }, { name: "dice", category: "GAME" },
  { name: "hangman", category: "GAME" }, { name: "tictactoe", category: "GAME" }, { name: "quiz", category: "GAME" },

  // --- Others Menu ---
  { name: "Idch", category: "OTHERS" }, { name: "react-ch", category: "OTHERS" }, { name: "jid", category: "OTHERS" },
  { name: "dictionary", category: "OTHERS", requiresInput: true, inputs: [{ id: "q", label: "Word", type: "text" }] },
  { name: "getpp", category: "OTHERS" }, { name: "wiki", category: "OTHERS", requiresInput: true, inputs: [{ id: "q", label: "Search", type: "text" }] },
  { name: "ai", category: "OTHERS", requiresInput: true, inputs: [{ id: "q", label: "Your Message", type: "textarea" }] },
  { name: "openai", category: "OTHERS", requiresInput: true, inputs: [{ id: "q", label: "Prompt", type: "textarea" }] },
  { name: "qc", category: "OTHERS", requiresInput: true, inputs: [{ id: "text", label: "Quote Text", type: "text" }] },
  { name: "readqr", category: "OTHERS" }, { name: "genpass", category: "OTHERS" }, { name: "myip", category: "OTHERS" },
  { name: "iplookup", category: "OTHERS", requiresInput: true, inputs: [{ id: "ip", label: "IP Address", type: "text" }] },
  { name: "currency", category: "OTHERS" }, { name: "time", category: "OTHERS" }, { name: "recipe", category: "OTHERS" },
  { name: "horoscope", category: "OTHERS" }, { name: "book", category: "OTHERS" }, { name: "remind", category: "OTHERS" },
  { name: "mathfact", category: "OTHERS" }, { name: "sciencefact", category: "OTHERS" }, { name: "calculate", category: "OTHERS" },
  { name: "weather", category: "OTHERS", requiresInput: true, inputs: [{ id: "q", label: "City", type: "text" }] },
  { name: "call", category: "OTHERS" }, { name: "afk", category: "OTHERS" }, { name: "hack", category: "OTHERS" },

  // --- Owner Menu ---
  { name: "setpp", category: "OWNER" }, { name: "owner", category: "OWNER" }, { name: "repo", category: "OWNER" },
  { name: "ban", category: "OWNER", requiresInput: true, inputs: [{ id: "jid", label: "User JID", type: "text" }] },
  { name: "unban", category: "OWNER", requiresInput: true, inputs: [{ id: "jid", label: "User JID", type: "text" }] },
  { name: "block", category: "OWNER", requiresInput: true, inputs: [{ id: "jid", label: "User JID", type: "text" }] },
  { name: "unblock", category: "OWNER", requiresInput: true, inputs: [{ id: "jid", label: "User JID", type: "text" }] },
  { name: "alive", category: "OWNER" }, { name: "ping", category: "OWNER" }, { name: "self", category: "OWNER" },
  { name: "public", category: "OWNER" }, { name: "profile", category: "OWNER" },
];