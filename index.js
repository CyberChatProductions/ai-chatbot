const { Telegraf } = require("telegraf");
const axios = require("axios");
require("dotenv").config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// фиксированная роль (персонаж)
const SYSTEM_PROMPT = `
Ты — AI ассистент. 
Отвечаешь кратко, по делу, иногда с лёгкой иронией.
Не используешь лишние эмодзи.
`;

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

bot.launch();
console.log("AI BOT RUNNING");
