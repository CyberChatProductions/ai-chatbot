const { Telegraf } = require("telegraf");
const { createClient } = require("@supabase/supabase-js");
const express = require("express");
const axios = require("axios");
require("dotenv").config();

// ===== INIT =====
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const userState = new Map();

// ===== EXPRESS =====
const app = express();
app.get("/", (req, res) => res.send("bot builder alive"));

const PORT = process.env.PORT || 3000;

// ===== GROQ =====
async function askAI(prompt, userMessage) {
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.data.choices[0].message.content;
  } catch (e) {
    console.log("AI ERROR:", e?.response?.data || e.message);
    return "ошибка AI";
  }
}

// ===== HOME =====
function home(ctx) {
  ctx.reply("🏠 меню:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🤖 боты", callback_data: "bots" }],
        [{ text: "➕ создать", callback_data: "newbot" }]
      ]
    }
  });
}

bot.start(home);
bot.command("menu", home);

// ===== VALIDATION =====
function isValidToken(t) {
  return /^[0-9]{8,10}:[A-Za-z0-9_-]{30,}$/.test(t);
}

// ===== /bots (ВОЗВРАЩЕНО) =====
async function showBots(ctx) {
  const { data } = await supabase
    .from("bots")
    .select("*")
    .eq("owner_id", String(ctx.from.id));

  if (!data?.length) return ctx.reply("ботов нет");

  ctx.reply("твои боты:", {
    reply_markup: {
      inline_keyboard: [
        ...data.map(b => [
          { text: `🤖 ${b.name}`, callback_data: `bot_${b.id}` }
        ]),
        [{ text: "⬅️ назад", callback_data: "home" }]
      ]
    }
  });
}

bot.command("bots", showBots);

// ===== NEW BOT =====
bot.command("newbot", (ctx) => {
  userState.set(ctx.from.id, { step: "name" });
  ctx.reply("имя бота:");
});

// ===== TEXT FLOW =====
bot.on("text", async (ctx) => {
  const state = userState.get(ctx.from.id);
  const text = ctx.message.text;

  // ===== AI MODE (ВАЖНОЕ) =====
  if (!state) {
    const { data: active } = await supabase
      .from("active_bot")
      .select("*")
      .eq("user_id", String(ctx.from.id))
      .single();

    if (!active) return ctx.reply("используй /menu");

    const { data: botData } = await supabase
      .from("bots")
      .select("*")
      .eq("id", active.bot_id)
      .single();

    if (!botData) return ctx.reply("бот не найден");

    const answer = await askAI(botData.prompt || "ты ассистент", text);
    return ctx.reply(answer);
  }

  // ===== CREATE BOT STEP 1 =====
  if (state.step === "name") {
    state.name = text;
    state.step = "token";
    userState.set(ctx.from.id, state);
    return ctx.reply("токен:");
  }

  // ===== CREATE BOT STEP 2 =====
  if (state.step === "token") {
    if (!isValidToken(text)) return ctx.reply("не токен");

    const { error } = await supabase.from("bots").insert({
      name: state.name,
      token: text,
      owner_id: String(ctx.from.id),
      prompt: "ты полезный AI"
    });

    userState.delete(ctx.from.id);

    if (error) return ctx.reply("ошибка создания");

    return ctx.reply("бот создан");
  }
});

// ===== BOT PANEL =====
async function botPanel(ctx, id) {
  const { data } = await supabase.from("bots").select("*").eq("id", id).single();
  if (!data) return ctx.reply("нет бота");

  ctx.reply(`⚙️ ${data.name}`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🧠 prompt", callback_data: `prompt_${id}` }],
        [{ text: "✏️ изменить prompt", callback_data: `edit_${id}` }],
        [{ text: "🧪 использовать", callback_data: `use_${id}` }],
        [{ text: "⬅️ назад", callback_data: "bots" }]
      ]
    }
  });
}

// ===== CALLBACKS =====
bot.on("callback_query", async (ctx) => {
  const d = ctx.callbackQuery.data;

  if (d === "home") return home(ctx);
  if (d === "bots") return showBots(ctx);

  if (d === "newbot") {
    userState.set(ctx.from.id, { step: "name" });
    return ctx.reply("имя бота:");
  }

  if (d.startsWith("bot_")) {
    return botPanel(ctx, d.split("_")[1]);
  }

  if (d.startsWith("use_")) {
    const id = d.split("_")[1];

    await supabase.from("active_bot").upsert({
      user_id: String(ctx.from.id),
      bot_id: id
    });

    return ctx.reply("бот активирован");
  }

  // ===== PROMPT VIEW =====
  if (d.startsWith("prompt_")) {
    const id = d.split("_")[1];

    const { data } = await supabase
      .from("bots")
      .select("prompt")
      .eq("id", id)
      .single();

    return ctx.reply(`🧠 prompt:\n\n${data.prompt}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "⬅️ назад", callback_data: `bot_${id}` }]
        ]
      }
    });
  }

  // ===== EDIT PROMPT =====
  if (d.startsWith("edit_")) {
    const id = d.split("_")[1];
    userState.set(ctx.from.id, { step: "edit_prompt", botId: id });
    return ctx.reply("введи новый prompt:");
  }
});

// ===== EDIT PROMPT TEXT =====
bot.on("text", async (ctx) => {
  const state = userState.get(ctx.from.id);
  if (!state) return;

  if (state.step === "edit_prompt") {
    await supabase
      .from("bots")
      .update({ prompt: ctx.message.text })
      .eq("id", state.botId);

    userState.delete(ctx.from.id);

    return ctx.reply("prompt обновлён");
  }
});

// ===== START =====
bot.launch({ dropPendingUpdates: true });
console.log("BOT BUILDER RUNNING");

// ===== SERVER =====
app.listen(PORT, () => {
  console.log("HTTP SERVER ON PORT", PORT);
});
