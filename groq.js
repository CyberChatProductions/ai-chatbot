const axios = require("axios");
const { GROQ_KEY } = require("./config");

async function askGroq(messages) {
  const res = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "openai/gpt-oss-20b",
      messages,
      temperature: 0.8,
      max_tokens: 500
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return res.data.choices[0].message.content;
}

module.exports = askGroq;
