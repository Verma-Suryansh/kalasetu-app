export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { transcript, artisan, rawImageBase64 } = req.body;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;

  try {
    // 1. CALL GROQ (Llama-3) FOR EXTRACTION & MULTI-LINGUAL SEO
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are the KALA-SETU AI cataloging engine. Given an artisan voice transcript:
1. Extract craft name (title), category, materialCost (number only), and laborHours (number only).
2. If numbers are missing, default materialCost to 150 and laborHours to 3.
3. Calculate: fairLabourValue = laborHours * 150. operationalCost = 50. fairBaseline = materialCost + fairLabourValue + operationalCost. suggestedPrice = fairBaseline + 49.
4. Write a 2-sentence SEO description in English (description_en). Translate it perfectly into Hindi (description_hi) and Tamil (description_ta).
Respond STRICTLY in valid JSON format:
{"title":"","category":"","materialCost":0,"laborHours":0,"fairLabourValue":0,"operationalCost":50,"fairBaseline":0,"suggestedPrice":0,"description_en":"","description_hi":"","description_ta":""}`
          },
          { role: "user", content: `Artisan: ${artisan}. Transcript: "${transcript}"` }
        ],
        temperature: 0.2
      })
    });

    const groqData = await groqResponse.json();
    let parsedContent = JSON.parse(groqData.choices[0].message.content.trim());

    // 2. CALL REMOVE.BG FOR STUDIO SEGMENTATION
    let studioImage = null;
    if (rawImageBase64 && REMOVE_BG_API_KEY) {
      try {
        const cleanBase64 = rawImageBase64.replace(/^data:image\/\w+;base64,/, "");
        const bgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: { 'X-Api-Key': REMOVE_BG_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_file_b64: cleanBase64, size: 'preview', bg_color: 'FDFBF7' })
        });
        if (bgResponse.ok) {
          const arrayBuffer = await bgResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          studioImage = `data:image/png;base64,${buffer.toString('base64')}`;
        }
      } catch (imgErr) { console.warn("Image fallback:", imgErr); }
    }

    return res.status(200).json({ aiData: parsedContent, studioImage: studioImage });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}