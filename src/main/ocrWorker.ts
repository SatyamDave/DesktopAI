import { parentPort, workerData } from "worker_threads";
import * as Tesseract from "tesseract.js";
import OpenAI from "openai";

(async()=>{
  const { data:{ text } } = await Tesseract.recognize(workerData, "eng", { logger: undefined });
  const prompt = text.slice(0,3000);

  const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1"
  });
  const resp = await openai.chat.completions.create({
    model:"gpt-4o-mini",
    messages:[
      {role:"system", content:"Summarize the captured screen in ≤4 sentences, then list 3 actionable suggestions."},
      {role:"user",   content: prompt}
    ]
  });
  parentPort!.postMessage({
    success:true,
    summary:resp.choices[0].message.content || ""
  });
})(); 