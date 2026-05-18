const { Telegraf } = require("telegraf");
const axios = require("axios");
const express = require("express");
require("dotenv").config();

// ===== TELEGRAM BOT =====
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// ===== EXPRESS (обязательно для Render) =====
const app = express();
app.get("/", (req, res) => {
  res.send("bot alive");
});

const PORT = process.env.PORT || 3000;

// ===== AI PROMPT =====
const SYSTEM_PROMPT = `
Ты — AI ассистент.
Отвечаешь кратко, понятно, без лишней воды.
Иногда используешь лёгкую иронию.
Эмодзи используешь умеренно.
`;

// ===== GROQ REQUEST =====
async function askAI(message) {
  const res = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama-3.3-70b-instruct",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return res.data.choices[0].message.content;
}

// ===== TELEGRAM EVENTS =====
bot.start((ctx) => {
  ctx.reply("бот жив");
});

bot.on("text", async (ctx) => {
  try {
    const text = ctx.message.text;
    const reply = await askAI(text);
    ctx.reply(reply);
  } catch (err) {
    console.log(err);
    ctx.reply("ошибка AI");
  }
});

// ===== START BOT =====
bot.launch();
console.log("AI BOT RUNNING");

// ===== START SERVER (Render fix) =====
app.listen(PORT, () => {
  console.log("HTTP SERVER ON PORT", PORT);
});
