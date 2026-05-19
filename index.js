const { Telegraf } = require("telegraf");
const { createClient } = require("@supabase/supabase-js");
const express = require("express");
require("dotenv").config();

const { launchBot } = require("./runtime");

// ================= INIT =================
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const userState = new Map();

// ================= SERVER =================
const app = express();

app.get("/", (req, res) => {
  res.send("bot builder alive");
});

const PORT = process.env.PORT || 3000;

// ================= HOME =================
function home(ctx) {

  ctx.reply("🏠 конструктор:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🤖 мои боты", callback_data: "bots" }],
        [{ text: "➕ создать бота", callback_data: "newbot" }]
      ]
    }
  });
}

bot.start(home);
bot.command("menu", home);
bot.command("bots", showBots);

// ================= TOKEN VALIDATION =================
function isValidToken(t) {
  return /^[0-9]{8,10}:[A-Za-z0-9_-]{30,}$/.test(t);
}

// ================= SHOW BOTS =================
async function showBots(ctx) {

  const { data } = await supabase
    .from("bots")
    .select("*")
    .eq("owner_id", String(ctx.from.id));

  if (!data?.length) {
    return ctx.reply("ботов нет");
  }

  ctx.reply("🤖 твои боты:", {
    reply_markup: {
      inline_keyboard: [
        ...data.map(b => [
          {
            text: b.name,
            callback_data: `bot_${b.id}`
          }
        ]),
        [
          {
            text: "⬅️ назад",
            callback_data: "home"
          }
        ]
      ]
    }
  });
}

// ================= NEW BOT =================
bot.command("newbot", (ctx) => {

  userState.set(ctx.from.id, {
    step: "name"
  });

  ctx.reply(
    "введи имя бота:"
  );
});

// ================= CALLBACKS =================
bot.on("callback_query", async (ctx) => {

  const d = ctx.callbackQuery.data;

  // ================= HOME =================
  if (d === "home") {
    return home(ctx);
  }

  // ================= BOTS =================
  if (d === "bots") {
    return showBots(ctx);
  }

  // ================= NEW BOT =================
  if (d === "newbot") {

    userState.set(ctx.from.id, {
      step: "name"
    });

    return ctx.reply("введи имя бота:");
  }

  // ================= BOT PANEL =================
  if (d.startsWith("bot_")) {

    const id = d.split("_")[1];

    const { data } = await supabase
      .from("bots")
      .select("*")
      .eq("id", id)
      .single();

    if (!data) {
      return ctx.reply("бот не найден");
    }

    return ctx.reply(
      `⚙️ ${data.name}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🧠 prompt",
                callback_data: `prompt_${id}`
              }
            ],
            [
              {
                text: "✏️ изменить prompt",
                callback_data: `edit_${id}`
              }
            ],
            [
              {
                text: "🚀 запустить",
                callback_data: `launch_${id}`
              }
            ],
            [
              {
                text: "⬅️ назад",
                callback_data: "bots"
              }
            ]
          ]
        }
      }
    );
  }

  // ================= VIEW PROMPT =================
  if (d.startsWith("prompt_")) {

    const id = d.split("_")[1];

    const { data } = await supabase
      .from("bots")
      .select("prompt")
      .eq("id", id)
      .single();

    return ctx.reply(
      `🧠 prompt:\n\n${data.prompt}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "⬅️ назад",
                callback_data: `bot_${id}`
              }
            ]
          ]
        }
      }
    );
  }

  // ================= EDIT PROMPT =================
  if (d.startsWith("edit_")) {

    const id = d.split("_")[1];

    userState.set(ctx.from.id, {
      step: "edit_prompt",
      botId: id
    });

    return ctx.reply(
      "✏️ отправь новый prompt:"
    );
  }

  // ================= LAUNCH BOT =================
  if (d.startsWith("launch_")) {

    const id = d.split("_")[1];

    const { data } = await supabase
      .from("bots")
      .select("*")
      .eq("id", id)
      .single();

    if (!data) {
      return ctx.reply("бот не найден");
    }

    await launchBot(data);

    return ctx.reply(
      "✅ бот запущен"
    );
  }
});

// ================= TEXT =================
bot.on("text", async (ctx) => {

  const text = ctx.message.text;

  const state = userState.get(ctx.from.id);

  // ================= CREATE BOT =================
  if (state?.step === "name") {

    state.name = text;
    state.step = "token";

    userState.set(ctx.from.id, state);

    return ctx.reply(
      "теперь отправь токен бота:"
    );
  }

  if (state?.step === "token") {

    if (!isValidToken(text)) {
      return ctx.reply(
        "❌ неверный токен"
      );
    }

    const { error } = await supabase
      .from("bots")
      .insert({
        name: state.name,
        token: text,
        owner_id: String(ctx.from.id),
        prompt: "ты полезный AI ассистент"
      });

    userState.delete(ctx.from.id);

    if (error) {

      console.log(error);

      return ctx.reply(
        "ошибка создания бота"
      );
    }

    return ctx.reply(
      "✅ бот создан"
    );
  }

  // ================= EDIT PROMPT =================
  if (state?.step === "edit_prompt") {

    const { error } = await supabase
      .from("bots")
      .update({
        prompt: text
      })
      .eq("id", state.botId);

    userState.delete(ctx.from.id);

    if (error) {

      console.log(error);

      return ctx.reply(
        "ошибка обновления prompt"
      );
    }

    return ctx.reply(
      "✅ prompt обновлён"
    );
  }
});

// ================= START =================
bot.launch({
  dropPendingUpdates: true
});

console.log("BOT BUILDER RUNNING");

// ================= SERVER =================
app.listen(PORT, () => {

  console.log(
    "HTTP SERVER ON PORT",
    PORT
  );
});
