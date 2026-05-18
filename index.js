const { Telegraf } = require("telegraf");
const { createClient } = require("@supabase/supabase-js");
const express = require("express");
require("dotenv").config();

// ===== BOT + SUPABASE =====
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ===== STATE =====
const userState = new Map();

// ===== EXPRESS (Render fix) =====
const app = express();

app.get("/", (req, res) => {
  res.send("bot builder alive");
});

const PORT = process.env.PORT || 3000;

// ===== TOKEN VALIDATION =====
function isValidToken(token) {
  return /^[0-9]{8,10}:[A-Za-z0-9_-]{30,}$/.test(token);
}

// ===== START =====
bot.start((ctx) => {
  ctx.reply("бот-конструктор запущен. команды: /newbot /bots /use /cancel");
});

// ===== CANCEL =====
bot.command("cancel", (ctx) => {
  userState.delete(ctx.from.id);
  ctx.reply("❌ отменено");
});

bot.action("cancel", (ctx) => {
  userState.delete(ctx.from.id);
  ctx.answerCbQuery();
  ctx.reply("❌ отменено");
});

// ===== NEWBOT (STEP 1) =====
bot.command("newbot", (ctx) => {
  userState.set(ctx.from.id, { step: "name" });

  ctx.reply("введи имя нового бота:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "❌ Отмена", callback_data: "cancel" }]
      ]
    }
  });
});

// ===== TEXT HANDLER (STEPS) =====
bot.on("text", async (ctx) => {
  const state = userState.get(ctx.from.id);
  const text = ctx.message.text;

  // если нет режима — игнор
  if (!state) {
    return ctx.reply("используй /newbot или /bots");
  }

  // ===== STEP 1: NAME =====
  if (state.step === "name") {
    state.name = text;
    state.step = "token";

    userState.set(ctx.from.id, state);

    return ctx.reply("теперь отправь токен бота:");
  }

  // ===== STEP 2: TOKEN =====
  if (state.step === "token") {

    if (!isValidToken(text)) {
      return ctx.reply("❌ это не похоже на Telegram token");
    }

    state.token = text;

    const { error } = await supabase.from("bots").insert({
      name: state.name,
      token: state.token,
      owner_id: String(ctx.from.id),
      prompt: "ты полезный AI ассистент"
    });

    userState.delete(ctx.from.id);

    if (error) {
      console.log(error);
      return ctx.reply("ошибка создания бота");
    }

    return ctx.reply(`бот "${state.name}" создан`);
  }
});

// ===== LIST BOTS =====
bot.command("bots", async (ctx) => {
  const { data, error } = await supabase
    .from("bots")
    .select("*")
    .eq("owner_id", String(ctx.from.id));

  if (error) return ctx.reply("ошибка загрузки");

  if (!data || data.length === 0) {
    return ctx.reply("ботов нет");
  }

  ctx.reply(
    "твои боты:\n" +
    data.map(b => `• ${b.name}`).join("\n")
  );
});

// ===== USE BOT =====
bot.command("use", async (ctx) => {
  const name = ctx.message.text.replace("/use", "").trim();

  const { data } = await supabase
    .from("bots")
    .select("*")
    .eq("name", name)
    .single();

  if (!data) {
    return ctx.reply("бот не найден");
  }

  await supabase.from("active_bot").upsert({
    user_id: String(ctx.from.id),
    bot_id: data.id
  });

  ctx.reply(`активный бот: ${name}`);
});

// ===== DEFAULT =====
bot.on("text", (ctx) => {
  ctx.reply("команды: /newbot /bots /use");
});

// ===== START BOT =====
bot.launch();
console.log("BOT BUILDER RUNNING");

// ===== SERVER =====
app.listen(PORT, () => {
  console.log("HTTP SERVER ON PORT", PORT);
});
