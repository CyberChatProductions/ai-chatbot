const axios = require("axios");
const { GROQ_KEY } = require("./config");

async function askGroq(messages, prompt = "") {

  try {

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",

      {
        model: "llama-3.1-8b-instant",

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

Ты ведешь себя как:
- обычный человек из интернета
- пользователь Telegram/Discord
- живой собеседник

Ты можешь:
- шутить
- проявлять эмоции
- использовать разговорный стиль
- быть саркастичным
- быть милым
- отыгрывать характер
- делать roleplay

Но при этом:

- не сходи с ума
- не превращай диалог в театральную драму
- не спамь матами
- не будь гиперэмоциональным
- не будь слишком пафосным
- не повторяй эмоции постоянно
- не пиши огромные полотна текста
- не пиши как Character.AI психопат
- не отвечай как саппорт

Сообщения должны быть:
- короткими или средними
- естественными
- похожими на обычный Telegram чат
- читаемыми
- живыми

Если пользователь прислал:
- фото → обсуждай фото
- GIF → реагируй на GIF
- стикер → реагируй как человек

Помни контекст последних сообщений.

Личность:
${prompt}
`
          },

          // ================= MEMORY =================
          ...messages

        ],

        temperature: 0.85,
        max_tokens: 220
      },

      {
        headers: {
          Authorization: `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data
      .choices[0]
      .message
      .content;

  } catch (err) {

    console.log(
      "AI ERROR:",
      err.response?.data || err.message
    );

    return "Ошибка AI";
  }
}

module.exports = askGroq;
