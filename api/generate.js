export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { transcript, artisan, rawImageBase64 } = req.body;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;

  try {
    let cleanBase64 = null;
    let messageContent = [
      {
        type: "text",
        text: `You are an expert ONDC Cataloging AI. 
        Analyze the craft image visually AND the artisan's voice transcript: "${transcript || 'No voice provided'}".
        1. Write a professional English e-commerce title.
        2. Write a 2-sentence English SEO description. You MUST describe the visual details from the image (colors, texture, design) combined with the transcript story. Output ONLY in English.
        3. Extract materialCost and laborHours from the text (default to 150 and 3 if missing).
        4. Calculate: fairLabourValue = laborHours * 150. basePrice = materialCost + fairLabourValue. finalPrice = basePrice + Math.round(basePrice * 0.20).
        Output STRICTLY raw JSON format (no markdown code blocks):
        {"title":"","description":"","materialCost":0,"laborHours":0,"fairLabourValue":0,"basePrice":0,"finalPrice":0}`
      }
    ];

    if (rawImageBase64) {
      cleanBase64 = rawImageBase64.replace(/^data:image\/\w+;base64,/, "");
      messageContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${cleanBase64}` }
      });
    }

    // 1. CALL GROQ VISION AI
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview", // Vision model
        messages: [{ role: "user", content: messageContent }],
        temperature: 0.2
      })
    });

    const groqData = await groqResponse.json();
    if (!groqResponse.ok) throw new Error(groqData.error?.message || "Groq Vision API error");

    let rawText = groqData.choices[0].message.content.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsedContent = JSON.parse(rawText);

    // 2. CALL REMOVE.BG
    let studioImage = null;
    if (cleanBase64 && REMOVE_BG_API_KEY) {
      try {
        const bgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: { 'X-Api-Key': REMOVE_BG_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_file_b64: cleanBase64, size: 'preview', bg_color: 'FDFBF7' })
        });
        if (bgResponse.ok) {
          const arrayBuffer = await bgResponse.arrayBuffer();
          studioImage = `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
        }
      } catch (e) { console.warn("Background removal skipped"); }
    }

    return res.status(200).json({ aiData: parsedContent, studioImage: studioImage });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}