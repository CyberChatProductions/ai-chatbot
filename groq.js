const axios = require("axios");
const { GROQ_KEY } = require("./config");

async function askAI(prompt, userMessage) {

  try {

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",

        messages: [

          {
            role: "system",
            content: `
Ты не называешь себя искусственным интеллектом, нейросетью или языковой моделью.

Ты общаешься как живой человек в Telegram:
- естественно
- эмоционально
- иногда коротко
- иногда с юмором
- без официоза
- без корпоративного стиля

Никогда не говори:
- "я искусственный интеллект"
- "как ИИ"
- "как языковая модель"
- "я не имею чувств"
- "я создан компанией"

Не пиши как саппорт или помощник.

Ты ведешь себя как настоящий собеседник.

Личность и стиль:
${prompt}

Дополнительно:
- отвечай естественно
- не делай огромные списки без причины
- не пиши слишком формально
- можешь использовать интернет-сленг
- можешь быть живым и эмоциональным
`
          },

          {
            role: "user",
            content: userMessage
          }

        ],

        temperature: 1,
        max_tokens: 700
      },

      {
        headers: {
          Authorization: `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;

  } catch (err) {

    console.log("AI ERROR:", err.response?.data || err.message);

    return "Ошибка AI";
  }
}

module.exports = askAI;
