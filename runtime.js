const { Telegraf } = require("telegraf");
const { createClient } = require("@supabase/supabase-js");
const askGroq = require("./groq");
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
  bot.on(
    ["text", "photo", "animation", "sticker"],
    async (ctx) => {

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

  let visionText = "vision disabled";

  try {
    visionText = await describeImage(fileLink.href);
  } catch (e) {
    console.log("VISION ERROR:", e);
  }

  userMessage = `
[PHOTO]

AI VISION:
${visionText}

caption:
${caption || "none"}

url:
${fileLink.href}
`;
}
        // ================= GIF =================
const fileLink = await ctx.telegram.getFileLink(
  ctx.message.animation.file_id
);

const caption = ctx.message.caption || "";

userMessage = `
[GIF]

caption:
${caption || "none"}

note:
animated content sent
url:
${fileLink.href}
`;
        // ================= STICKER =================
const s = ctx.message.sticker;

userMessage = `
[STICKER]

emoji: ${s.emoji || "none"}
type: ${s.is_animated ? "animated" : "static"}
pack: ${s.set_name || "unknown"}

note:
user reacted with sticker
`;
        // ================= GROUP LOGIC =================
        const isGroup =
          ctx.chat.type.includes("group");

        const isReply =
          ctx.message.reply_to_message
            ?.from?.username === me.username;

        const isMention =
          text.toLowerCase().includes(
            `@${me.username.toLowerCase()}`
          );

        const randomReply =
          Math.random() < 0.15;

        if (
          isGroup &&
          !isReply &&
          !isMention &&
          !randomReply
        ) {
          return;
        }

        // ================= MEMORY =================
        const memoryKey =
          `${botData.id}_${ctx.chat.id}`;

        if (!chatMemory.has(memoryKey)) {
          chatMemory.set(memoryKey, []);
        }

        const memory =
          chatMemory.get(memoryKey);

        memory.push({
          role: "user",
          content: text
        });

        // ~15 сообщений
        if (memory.length > 30) {
          memory.shift();
        }

        await ctx.sendChatAction("typing");

        // ================= AI =================
        const reply = await askGroq(
          memory,

          `
${fresh.prompt || ""}
`
        );

        // ================= SAVE MEMORY =================
        memory.push({
          role: "assistant",
          content: reply
        });

        if (memory.length > 30) {
          memory.shift();
        }

        await ctx.reply(reply);

      } catch (err) {

        console.log(
          "RUNTIME ERROR:",
          err
        );
      }
    }
  );

  bot.launch({
    dropPendingUpdates: true
  });

  launchedBots.set(
    botData.token,
    bot
  );
}

module.exports = {
  launchBot
};
