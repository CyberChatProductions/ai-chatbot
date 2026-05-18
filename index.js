const { Telegraf } = require("telegraf");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const express = require("express");
require("dotenv").config();

// ===== ENV =====
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ===== EXPRESS (Render fix) =====
const app = express();

app.get("/", (req, res) => {
  res.send("bot builder alive");
});

const PORT = process.env.PORT || 3000;

// ===== HEALTH =====
console.log("BOT BUILDER STARTED");

// ===== CREATE BOT =====
bot.command("newbot", async (ctx) => {
  const text = ctx.message.text.replace("/newbot", "").trim();
  const [name, token] = text.split("|");

  if (!name || !token) {
    return ctx.reply("формат: /newbot name|token");
  }

  const { error } = await supabase.from("bots").insert({
    name: name.trim(),
    token: token.trim(),
    owner_id: String(ctx.from.id),
    prompt: "ты полезный AI ассистент"
  });

  if (error) {
    console.log(error);
    return ctx.reply("ошибка создания бота");
  }

  ctx.reply(`бот "${name}" создан`);
});

// ===== LIST BOTS =====
bot.command("bots", async (ctx) => {
  const { data, error } = await supabase
    .from("bots")
    .select("*")
    .eq("owner_id", String(ctx.from.id));

  if (error) {
    console.log(error);
    return ctx.reply("ошибка");
  }

  if (!data || data.length === 0) {
    return ctx.reply("ботов нет");
  }

  const list = data.map(b => `• ${b.name}`).join("\n");
  ctx.reply("твои боты:\n" + list);
});

// ===== SET ACTIVE BOT =====
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

// ===== DEFAULT MESSAGE =====
bot.on("text", (ctx) => {
  ctx.reply("команды: /newbot /bots /use");
});

// ===== START =====
bot.launch();
console.log("TELEGRAM READY");

// ===== EXPRESS START =====
app.listen(PORT, () => {
  console.log("HTTP SERVER ON PORT", PORT);
});
