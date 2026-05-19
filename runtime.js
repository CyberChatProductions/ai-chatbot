const { Telegraf } = require("telegraf");
const { createClient } = require("@supabase/supabase-js");
const askGroq = require("./groq");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const launchedBots = new Map();

// ================= LAUNCH =================
async function launchBot(botData) {

  if (launchedBots.has(botData.token)) return;

  const bot = new Telegraf(botData.token);

  const me = await bot.telegram.getMe();

  console.log(`🤖 @${me.username} launched`);

  // ================= HANDLER =================
  bot.on(["text", "photo", "animation", "sticker"], async (ctx) => {

    try {

      // ================= CHECK ENABLED =================
      const { data: fresh } = await supabase
        .from("bots")
        .select("enabled, prompt")
        .eq("id", botData.id)
        .single();

      if (!fresh?.enabled) return;

      let userMessage = "";

      // ================= TEXT =================
      if (ctx.message.text) {
        userMessage = ctx.message.text;
      }

      // ================= PHOTO =================
      if (ctx.message.photo) {

        const caption = ctx.message.caption || "";

        const file = ctx.message.photo.at(-1);
        const fileLink = await ctx.telegram.getFileLink(file.file_id);

        userMessage = `
[PHOTO]
caption: ${caption || "none"}
url: ${fileLink.href}
`;
      }

      // ================= GIF =================
      if (ctx.message.animation) {

        const caption = ctx.message.caption || "";

        const fileLink = await ctx.telegram.getFileLink(
          ctx.message.animation.file_id
        );

        userMessage = `
[GIF]
caption: ${caption || "none"}
url: ${fileLink.href}
`;
      }

      // ================= STICKER =================
      if (ctx.message.sticker) {

        const s = ctx.message.sticker;

        userMessage = `
[STICKER]
emoji: ${s.emoji || "none"}
set: ${s.set_name || "unknown"}
animated: ${s.is_animated}
file_id: ${s.file_id}
`;
      }

      const text = userMessage;

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

      // ================= AI =================
      const reply = await askGroq(
        text,
        `
${fresh.prompt || ""}

ВАЖНО:
- отвечай как живой человек
- ответы должны быть средними по длине
- не делай огромные тексты
- будь естественным
- учитывай что это Telegram чат
`
      );

      await ctx.reply(reply);

    } catch (err) {
      console.log("RUNTIME ERROR:", err);
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
