const { Telegraf } = require("telegraf");
const { createClient } = require("@supabase/supabase-js");
const askGroq = require("./groq");
const describeGif = require("./gifVision");
const describeImage = require("./vision");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const launchedBots = new Map();
const chatMemory = new Map();

// ================= LAUNCH =================
async function launchBot(botData) {

  if (launchedBots.has(botData.token)) return;

  const bot = new Telegraf(botData.token);

  const me = await bot.telegram.getMe();

  console.log(`🤖 @${me.username} launched`);

  // ================= HANDLER =================
  bot.on(["text", "photo", "animation", "sticker"], async (ctx) => {

    try {

      // ================= DB STATE =================
      const { data: fresh } = await supabase
        .from("bots")
        .select("enabled, prompt")
        .eq("id", botData.id)
        .single();

      if (fresh?.enabled === false) return;

      let userMessage = "";

      // ================= TEXT =================
      if (ctx.message.text) {
        userMessage = ctx.message.text;
      }

  // ================= PHOTO =================
  if (ctx.message.photo) {

    const caption = ctx.message.caption || "";

    const file = ctx.message.photo.at(-1);

    const fileLink = await ctx.telegram.getFileLink(
      file.file_id
    );

    let visionText = null;

    try {

      visionText = await describeImage(
        fileLink.href
      );

    } catch {}

    userMessage = `
  [PHOTO]

  description:
  ${visionText || "пользователь отправил изображение"}

  caption:
  ${caption || "none"}
  `;
  }

  // ================= GIF =================
  if (ctx.message.animation) {

    const caption = ctx.message.caption || "";

    userMessage = `
  [GIF]

  user sent animated content

  caption:
  ${caption || "none"}
  `;
  }
      // ================= GIF =================
   if (ctx.message.animation) {

  const caption = ctx.message.caption || "";

  const fileLink = await ctx.telegram.getFileLink(
    ctx.message.animation.file_id
  );

  let gifVision = "no vision";

  try {
    gifVision = await describeGif(fileLink.href);
  } catch {
    gifVision = "GIF not analyzed";
  }

  userMessage = `
[GIF]

VISION:
${gifVision}

caption:
${caption || "none"}

note:
animated video content

url:
${fileLink.href}
`;
}
      // ================= STICKER =================
      if (ctx.message.sticker) {

        const s = ctx.message.sticker;

        userMessage = `
[STICKER]

emoji: ${s.emoji || "none"}
pack: ${s.set_name || "unknown"}
animated: ${s.is_animated}
`;
      }

      // ================= SAFE TEXT =================
      const text = userMessage?.trim();

      if (!text) return;

      // ================= GROUP LOGIC =================
      const isGroup = ctx.chat.type.includes("group");

      const isReply =
        ctx.message.reply_to_message?.from?.username === me.username;

      const isMention =
        text.toLowerCase().includes(`@${me.username.toLowerCase()}`);

      const randomReply = Math.random() < 0.15;

      if (isGroup && !isReply && !isMention && !randomReply) {
        return;
      }

      await ctx.sendChatAction("typing");

      // ================= MEMORY =================
      const memoryKey =
        `${botData.id}_${ctx.chat.id}`;

      if (!chatMemory.has(memoryKey)) {
        chatMemory.set(memoryKey, []);
      }

      const memory = chatMemory.get(memoryKey);

      memory.push({
        role: "user",
        content: text
      });

      if (memory.length > 30) {
        memory.shift();
      }

      // ================= AI =================
      const reply = await askGroq(
        memory,
        `
${fresh.prompt || ""}

ВАЖНО:
- отвечай как живой человек
- сообщения средние по длине
- не будь слишком длинным
- естественный стиль Telegram
`
      );

      memory.push({
        role: "assistant",
        content: reply
      });

      if (memory.length > 30) {
        memory.shift();
      }

      await ctx.reply(reply);

    } catch {
      // silent fail (без логов как ты просил)
    }
  });

  bot.launch({
    dropPendingUpdates: true
  });

  launchedBots.set(botData.token, bot);
}

module.exports = {
  launchBot
};
