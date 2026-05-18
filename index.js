const { Telegraf } = require("telegraf");
const axios = require("axios");
const express = require("express");
require("dotenv").config();

// ===== ENV CHECK (ВАЖНО) =====
console.log("ENV CHECK:", {
  tg: process.env.TELEGRAM_TOKEN ? "OK" : "MISSING",
  groq: process.env.GROQ_KEY ? "OK" : "MISSING"
});

// ===== EXPRESS (Render fix) =====
const app = express();

app.get("/", (req, res) => {
  res.send("bot alive");
});

const PORT = process.env.PORT || 3000;

// ===== TELEGRAM BOT =====
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// ===== SYSTEM PROMPT =====
const SYSTEM_PROMPT = `
Ты AI ассистент.
Отвечаешь кратко, по делу.
Без лишней воды.
Иногда лёгкая ирония.
Эмодзи используешь умеренно.
`;

// ===== GROQ REQUEST =====
async function askAI(message) {
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
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

  } catch (err) {
    console.log("GROQ ERROR:", err.response?.data || err.message);
    return "ошибка AI";
  }
}

// ===== TELEGRAM EVENTS =====
bot.start((ctx) => {
  ctx.reply("бот жив");
});

bot.on("text", async (ctx) => {
  const text = ctx.message.text;
  const reply = await askAI(text);
  ctx.reply(reply);
});

// ===== START BOT =====
bot.launch();
console.log("AI BOT RUNNING");

// ===== START SERVER (Render requirement) =====
app.listen(PORT, () => {
  console.log("HTTP SERVER ON PORT", PORT);
});
