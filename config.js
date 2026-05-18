require("dotenv").config();

module.exports = {
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
  GROQ_KEY: process.env.GROQ_KEY,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,
};