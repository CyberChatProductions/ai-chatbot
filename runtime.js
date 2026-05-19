const { Telegraf } = require("telegraf");
const askGroq = require("./groq");

const launchedBots = new Map();

async function launchBot(botData) {

  // ================= ANTI DUPLICATE =================
  if (launchedBots.has(botData.token)) {
    return;
  }

  const bot = new Telegraf(botData.token);

  // ================= BOT INFO =================
  const me = await bot.telegram.getMe();

  console.log(`🤖 launched: @${me.username}`);

  // ================= AI HANDLER =================
  bot.on("text", async (ctx) => {

    try {

      const text = ctx.message.text || "";

      // ================= CHAT TYPE =================
      const isGroup =
        ctx.chat.type.includes("group");

      // ================= REPLY =================
      const isReply =
        ctx.message.reply_to_message?.from?.username === me.username;

      // ================= MENTION =================
      const isMention =
        text
          .toLowerCase()
          .includes(`@${me.username.toLowerCase()}`);

      // ================= RANDOM MESSAGE =================
      const randomReply =
        Math.random() < 0.15;

      // ================= GROUP FILTER =================
      if (isGroup) {

        if (
          !isReply &&
          !isMention &&
          !randomReply
        ) {
          return;
        }
      }

      // ================= TYPING =================
      await ctx.sendChatAction("typing");

      // ================= CLEAN TEXT =================
      const cleanedText = text
        .replace(`@${me.username}`, "")
        .trim();

      // ================= AI =================
      const reply = await askGroq(
        cleanedText,
        `
${botData.prompt || ""}

Дополнительные правила:
- отвечай как живой человек
- сообщения должны быть средней длины
- не пиши огромные полотна текста
- чаще отвечай кратко или средне
- пиши естественно
- избегай формального стиля
- не используй нумерованные списки без причины
- не говори что ты ИИ
`
      );

      // ================= SEND =================
      await ctx.reply(reply);

    } catch (err) {

      console.log("RUNTIME ERROR:", err);

      try {
        await ctx.reply("Ошибка AI");
      } catch {}
    }
  });

  // ================= START =================
  bot.launch({
    dropPendingUpdates: true
  });

  // ================= SAVE =================
  launchedBots.set(
    botData.token,
    bot
  );
}

module.exports = {
  launchBot
};
