const axios = require("axios");
const { GROQ_KEY } = require("./config");

async function askGroq(userMessage, prompt = "") {

  try {

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",

      {
        model: "llama-3.3-70b-versatile",

        messages: [

          // ================= SYSTEM =================
          {
            role: "system",

            content: `
Ты общаешься как живой человек в Telegram.

Ты НЕ:
- искусственный интеллект
- нейросеть
- языковая модель
- AI assistant

Ты можешь:
- шутить
- проявлять эмоции
- общаться как персонаж
- быть милым
- быть саркастичным
- отыгрывать характер
- использовать разговорный стиль

Но при этом:

- не сходи с ума
- не превращай диалог в драматическую сцену
- не повторяй одни и те же эмоции
- не спамь матами
- не будь гиперэмоциональным
- не пиши огромные полотна текста
- не отвечай слишком длинно
- не будь слишком пафосным
- не веди себя как обезумевший character.ai бот

Сообщения должны быть:
- короткими или средними
- естественными
- похожими на обычный Telegram чат
- живыми
- читаемыми

Общайся как обычный человек из интернета.

Личность и характер:
${prompt}
`
          },

          // ================= USER =================
          {
            role: "user",
            content: userMessage
          }

        ],

        // ================= SETTINGS =================
        temperature: 0.75,
        max_tokens: 250
      },

      // ================= HEADERS =================
      {
        headers: {
          Authorization: `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;

  } catch (err) {

    console.log(
      "AI ERROR:",
      err.response?.data || err.message
    );

    return "Ошибка AI";
  }
}

module.exports = askGroq;
