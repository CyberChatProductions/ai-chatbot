const { Telegraf } = require("telegraf");
const { createClient } = require("@supabase/supabase-js");
const express = require("express");
require("dotenv").config();

// ===== INIT =====
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ===== STATE =====
const userState = new Map();

// ===== SERVER (Render fix) =====
const app = express();

app.get("/", (req, res) => {
  res.send("bot builder alive");
});

const PORT = process.env.PORT || 3000;

// ===== HOME MENU =====
function homeMenu(ctx) {
  ctx.reply("🏠 главное меню:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🤖 Мои боты", callback_data: "bots" }],
        [{ text: "➕ Создать бота", callback_data: "newbot" }]
      ]
    }
  });
}

bot.start(homeMenu);
bot.command("menu", homeMenu);

// ===== VALIDATION =====
function isValidToken(token) {
  return /^[0-9]{8,10}:[A-Za-z0-9_-]{30,}$/.test(token);
}

// ===== CANCEL =====
bot.command("cancel", (ctx) => {
  userState.delete(ctx.from.id);
  ctx.reply("❌ отменено");
});

// ===== NEW BOT FLOW =====
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

// ===== TEXT STEPS =====
bot.on("text", async (ctx) => {
  const state = userState.get(ctx.from.id);
  const text = ctx.message.text;

  if (!state) {
    return ctx.reply("используй /menu");
  }

  // STEP 1: NAME
  if (state.step === "name") {
    state.name = text;
    state.step = "token";
    userState.set(ctx.from.id, state);

    return ctx.reply("теперь отправь токен бота:");
  }

  // STEP 2: TOKEN
  if (state.step === "token") {
    if (!isValidToken(text)) {
      return ctx.reply("❌ неверный формат токена");
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

    return ctx.reply(`✅ бот "${state.name}" создан`);
  }
});

// ===== LIST BOTS =====
async function showBots(ctx) {
  const { data } = await supabase
    .from("bots")
    .select("*")
    .eq("owner_id", String(ctx.from.id));

  if (!data || data.length === 0) {
    return ctx.reply("ботов нет");
  }

  const buttons = data.map(b => [
    { text: `🤖 ${b.name}`, callback_data: `bot_${b.id}` }
  ]);

  ctx.reply("твои боты:", {
    reply_markup: {
      inline_keyboard: [
        ...buttons,
        [{ text: "⬅️ назад", callback_data: "home" }]
      ]
    }
  });
}

// ===== BOT PANEL =====
async function showBotPanel(ctx, botId) {
  const { data } = await supabase
    .from("bots")
    .select("*")
    .eq("id", botId)
    .single();

  if (!data) return ctx.reply("бот не найден");

  ctx.reply(`⚙️ ${data.name}`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🧠 prompt", callback_data: `prompt_${botId}` }],
        [{ text: "🧪 сделать активным", callback_data: `use_${botId}` }],
        [{ text: "⬅️ назад", callback_data: "bots" }]
      ]
    }
  });
}

// ===== CALLBACKS =====
bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;

  // HOME
  if (data === "home") {
    return homeMenu(ctx);
  }

  // NEWBOT
  if (data === "newbot") {
    userState.set(ctx.from.id, { step: "name" });

    return ctx.reply("введи имя нового бота:");
  }

  // BOTS LIST
  if (data === "bots") {
    return showBots(ctx);
  }

  // CANCEL
  if (data === "cancel") {
    userState.delete(ctx.from.id);
    ctx.answerCbQuery();
    return ctx.reply("❌ отменено");
  }

  // OPEN BOT
  if (data.startsWith("bot_")) {
    const botId = data.split("_")[1];
    return showBotPanel(ctx, botId);
  }

  // USE BOT
  if (data.startsWith("use_")) {
    const botId = data.split("_")[1];

    await supabase.from("active_bot").upsert({
      user_id: String(ctx.from.id),
      bot_id: botId
    });

    return ctx.reply("✅ бот активирован");
  }

  // PROMPT
  if (data.startsWith("prompt_")) {
    const botId = data.split("_")[1];

    const { data: bot } = await supabase
      .from("bots")
      .select("prompt")
      .eq("id", botId)
      .single();

    return ctx.reply(`🧠 prompt:\n\n${bot.prompt}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "⬅️ назад", callback_data: `bot_${botId}` }]
        ]
      }
    });
  }
});

// ===== DEFAULT =====
bot.on("text", (ctx) => {
  ctx.reply("используй /menu");
});

// ===== START =====
bot.launch();
console.log("BOT BUILDER RUNNING");

// ===== SERVER =====
app.listen(PORT, () => {
  console.log("HTTP SERVER ON PORT", PORT);
});
