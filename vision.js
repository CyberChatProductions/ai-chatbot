const fetch = require("node-fetch");

async function describeImage(url) {

  try {

    const res = await fetch(
      "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: url
        })
      }
    );

    const data = await res.json();

    if (Array.isArray(data)) {
      return data[0]?.generated_text || "не удалось распознать изображение";
    }

    return "vision error";

  } catch (err) {

    console.log("VISION ERROR:", err);

    return "ошибка vision";
  }
}

module.exports = describeImage;
