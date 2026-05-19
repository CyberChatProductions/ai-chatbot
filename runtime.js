const { Telegraf } = require("telegraf");
const axios = require("axios");

const runningBots = new Map();

async function askAI(prompt, message) {
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: prompt
          },
          {
            role: "user",
            content: message
          }
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

    return "❌ ошибка AI";
  }
}

async function launchBot(botData) {

  if (runningBots.has(botData.id)) {
    return;
  }

  try {

    const tgBot = new Telegraf(botData.token);

    tgBot.start((ctx) => {
      ctx.reply(`🤖 ${botData.name} активен`);
    });

    tgBot.on("text", async (ctx) => {

      const text = ctx.message.text;

      const answer = await askAI(
        botData.prompt || "ты AI ассистент",
        text
      );

      ctx.reply(answer);
    });

    tgBot.launch({
      dropPendingUpdates: true
    });

    runningBots.set(botData.id, tgBot);

    console.log("STARTED BOT:", botData.name);

  } catch (e) {

    console.log("BOT START ERROR:", e.message);
  }
}

module.exports = {
  launchBot
};