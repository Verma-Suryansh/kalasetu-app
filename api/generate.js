export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { transcript, artisan, rawImageBase64 } = req.body;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;

  try {
    // We use Llama-3.1-70b as it is the most stable and intelligent model for strict JSON
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [{
          role: "system",
          content: `You are a premium ONDC e-commerce cataloging engine. 
          Read this regional transcript from the artisan: "${transcript || 'Handmade craft'}".
          
          TASK:
          1. Translate to English.
          2. Create a premium E-commerce Title.
          3. Write a rich, engaging paragraph describing the craft, its cultural heritage, and visual appeal.
          4. Create an array of 3 short, punchy bullet points (e.g., "Handwoven using natural fibers").
          5. EXTRACT TIME: Extract the number for time taken. Extract the unit exactly as "days" or "hours". (Default to 3 and "hours" if not stated).
          6. EXTRACT MATERIAL COST: Extract the raw material cost in INR. (Default to 150 if not stated).
          
          OUTPUT STRICTLY RAW JSON:
          {
            "title": "",
            "description": "",
            "bulletPoints": ["", "", ""],
            "extracted_time_value": 0,
            "extracted_time_unit": "",
            "extracted_material_cost": 0
          }`
        }],
        temperature: 0.1
      })
    });

    if (!groqResponse.ok) throw new Error("AI Processing Failed");
    const groqData = await groqResponse.json();
    
    // Clean and parse JSON
    let content = groqData.choices[0].message.content.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    const aiData = JSON.parse(content.substring(start, end + 1));

    // ==========================================
    // DETERMINISTIC MATH ENGINE (Never Fails)
    // ==========================================
    let actualLaborHours = aiData.extracted_time_value;
    if (aiData.extracted_time_unit.toLowerCase().includes("day")) {
        actualLaborHours = actualLaborHours * 8; // 1 Day = 8 Hours
    }

    const materialCost = aiData.extracted_material_cost;
    const fairLabourValue = actualLaborHours * 150; // ₹150 per hour baseline
    const baseRecommendation = materialCost + fairLabourValue;
    const finalONDCPrice = baseRecommendation + Math.round(baseRecommendation * 0.20); // 20% default margin

    // Compile final calculated data
    const finalPayload = {
        title: aiData.title,
        description: aiData.description,
        bulletPoints: aiData.bulletPoints,
        materialCost: materialCost,
        laborHours: actualLaborHours,
        fairLabourValue: fairLabourValue,
        baseRecommendation: baseRecommendation,
        finalONDCPrice: finalONDCPrice
    };

    // ==========================================
    // BACKGROUND REMOVAL (Simulating BiRefNet)
    // ==========================================
    let studioImage = null;
    if (rawImageBase64 && REMOVE_BG_API_KEY) {
      try {
        const bgRes = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: { 'X-Api-Key': REMOVE_BG_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image_file_b64: rawImageBase64.replace(/^data:image\/\w+;base64,/, ""), 
            size: 'preview' 
            // NOTE: No bg_color parameter, so it returns transparent!
          })
        });
        if (bgRes.ok) {
          const buffer = await bgRes.arrayBuffer();
          studioImage = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
        }
      } catch (e) { console.error("RemoveBG Error"); }
    }

    return res.status(200).json({ aiData: finalPayload, studioImage: studioImage });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}