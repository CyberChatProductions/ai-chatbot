const axios = require("axios");

async function describeImage(url) {

  try {

    const image = await axios.get(url, {
      responseType: "arraybuffer"
    });

    const base64 = Buffer.from(image.data).toString("base64");

    const res = await axios.post(
      "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
      {
        inputs: base64
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN || ""}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (Array.isArray(res.data)) {
      return res.data[0]?.generated_text || "не удалось понять изображение";
    }

    return "vision error";

  } catch (e) {
    return "не удалось проанализировать изображение";
  }
}

module.exports = describeImage;
