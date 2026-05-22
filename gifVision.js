const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");

ffmpeg.setFfmpegPath(ffmpegPath);

async function describeGif(url) {

  const videoPath = "/tmp/input.mp4";
  const framePath = "/tmp/frame.jpg";

  try {

    // 1. скачать видео
    const video = await axios.get(url, {
      responseType: "arraybuffer"
    });

    fs.writeFileSync(videoPath, video.data);

    // 2. вытащить кадр (1 секунда)
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ["00:00:01"],
          filename: "frame.jpg",
          folder: "/tmp"
        })
        .on("end", resolve)
        .on("error", reject);
    });

    // 3. отправить кадр в HuggingFace BLIP
    const img = fs.readFileSync(framePath);
    const base64 = img.toString("base64");

    const res = await axios.post(
      "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
      { inputs: base64 },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN || ""}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.data?.[0]?.generated_text || "не удалось понять GIF";

  } catch (e) {
    return "GIF vision error";
  }
}

module.exports = describeGif;
