export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { transcript, artisan, rawImageBase64 } = req.body;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;

  try {
    let messageContent = [
      {
        type: "text",
        text: `You are an expert ONDC Cataloging AI. Analyze this craft visually (if image provided) AND the artisan's regional voice transcript: "${transcript || 'No voice provided'}".
        1. Translate any regional audio to English.
        2. Write a professional English e-commerce title.
        3. Write a 2-sentence English SEO description describing the visual details (colors, texture, design) combined with the translated transcript story. Output ONLY in English.
        4. Extract materialCost and laborHours (default to 150 and 3 if missing).
        5. Calculate: fairLabourValue = laborHours * 150. baseRecommendation = materialCost + fairLabourValue. finalONDCPrice = baseRecommendation + Math.round(baseRecommendation * 0.20).
        Output STRICTLY raw JSON starting with { and ending with }. No markdown blocks:
        {"title":"","description":"","materialCost":0,"laborHours":0,"fairLabourValue":0,"baseRecommendation":0,"finalONDCPrice":0}`
      }
    ];

    if (rawImageBase64) {
      const cleanBase64 = rawImageBase64.replace(/^data:image\/\w+;base64,/, "");
      messageContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${cleanBase64}` }
      });
    }

    // Failsafe JSON extractor
    const extractJSON = (text) => {
      let content = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start !== -1 && end !== -1) return JSON.parse(content.substring(start, end + 1));
      return JSON.parse(content);
    };

    let ai;
    try {
      // ATTEMPT 1: Active Multimodal Vision Model (Verified)
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages: [{ role: "user", content: messageContent }],
          temperature: 0.2
        })
      });

      if (!groqResponse.ok) throw new Error("Vision model failed");
      const groqData = await groqResponse.json();
      ai = extractJSON(groqData.choices[0].message.content);

    } catch (visionError) {
      // ATTEMPT 2: Active Text-Only Fallback (Verified)
      console.warn("Falling back to text model...");
      const fallbackResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b", 
          messages: [{ role: "user", content: messageContent[0].text }],
          temperature: 0.2
        })
      });
      
      const fallbackData = await fallbackResponse.json();
      if (!fallbackResponse.ok) throw new Error("All AI models failed. Please check Groq API limits.");
      ai = extractJSON(fallbackData.choices[0].message.content);
    }

    // Background Removal Polish
    let studioImage = null;
    if (rawImageBase64 && REMOVE_BG_API_KEY) {
      try {
        const bgRes = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: { 'X-Api-Key': REMOVE_BG_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_file_b64: rawImageBase64.replace(/^data:image\/\w+;base64,/, ""), size: 'preview', bg_color: 'FDFBF7' })
        });
        if (bgRes.ok) {
          const buffer = await bgRes.arrayBuffer();
          studioImage = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
        }
      } catch (e) {}
    }

    return res.status(200).json({ aiData: ai, studioImage: studioImage });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}