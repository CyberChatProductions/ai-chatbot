const axios = require("axios");

async function describeImage(url) {

  try {

    // скачиваем изображение
    const img = await axios.get(url, {
      responseType: "arraybuffer"
    });

    // отправляем как бинарник
    const res = await axios.post(
      "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
      img.data,
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/octet-stream"
        },
        timeout: 30000
      }
    );

    // HF иногда отвечает массивом
    if (Array.isArray(res.data)) {
      return res.data[0]?.generated_text || null;
    }

    return null;

  } catch {
    return null;
  }
}

module.exports = describeImage;
