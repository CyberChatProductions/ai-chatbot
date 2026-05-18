const { Telegraf } = require("telegraf");
const express = require("express");
require("dotenv").config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const app = express();
app.use(express.json());

bot.start((ctx) => {
  ctx.reply("бот жив");
});

bot.on("text", async (ctx) => {
  ctx.reply("ты написал: " + ctx.message.text);
});

app.use(bot.webhookCallback("/webhook"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("SERVER STARTED");

  const webhookUrl =
    process.env.RENDER_EXTERNAL_URL + "/webhook";

  await bot.telegram.setWebhook(webhookUrl);

  console.log("WEBHOOK:", webhookUrl);
});