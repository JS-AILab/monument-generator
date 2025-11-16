export default async function handler(req, res) {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { monumentRefImage, sceneImage } = req.body;

  if (!monumentRefImage || !sceneImage) {
    return res.status(400).json({ error: 'Both monument reference and scene images are required' });
  }

  try {
    const monumentBase64 = monumentRefImage.split(',')[1];
    const monumentMimeType = monumentRefImage.split(';')[0].split(':')[1];
    
    const sceneBase64 = sceneImage.split(',')[1];
    const sceneMimeType = sceneImage.split(';')[0].split(':')[1];

    const prompt = `TASK: Create a monument composite image

INPUT:
- FIRST IMAGE: Reference for the monument (what the monument should depict)
- SECOND IMAGE: The scene/location where to place the monument

YOUR JOB: Create ONE photorealistic image showing a monument/statue based on the first image, placed naturally in the scene from the second image.

MONUMENT CREATION:
- Study the FIRST IMAGE to understand what to create a monument of
- If it's a person: Create a statue of that person
- If it's an animal: Create a statue of that animal
- If it's an object: Create a monument version of that object
- Material: Bronze, marble, stone, or metal
- Style: Detailed, realistic, impressive monument

PLACEMENT IN SCENE:
- Use the SECOND IMAGE as the setting/location
- Place the monument ON THE GROUND (not floating)
- The BASE must touch the ground firmly
- Add realistic shadows UNDER and AROUND the monument
- Monument should look grounded, stable, and heavy
- NOT hovering or suspended in air

LIGHTING & INTEGRATION:
- Match lighting from the scene (sunny, cloudy, time of day)
- Cast shadows from monument onto ground
- Proper highlights and shadows on monument
- Monument fits naturally into environment
- Correct scale and perspective

OUTPUT:
- ONE photorealistic image
- Monument standing firmly on ground
- Natural integration with shadows
- Professional photograph quality
- Monument is the focal point

Create a scene that looks like a real photograph of an actual monument that has been built in this location.`;

    const contentParts = [
      {
        inline_data: {
          mime_type: monumentMimeType,
          data: monumentBase64
        }
      },
      {
        inline_data: {
          mime_type: sceneMimeType,
          data: sceneBase64
        }
      },
      {
        text: prompt
      }
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: contentParts
          }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            topK: 30,
            maxOutputTokens: 8192,
            responseMimeType: "text/plain",
            responseModalities: ["TEXT", "IMAGE"]
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', data);
      return res.status(500).json({ 
        error: data.error?.message || 'Failed to create composite',
        details: data 
      });
    }

    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData || part.inline_data) {
          const imageData = part.inlineData?.data || part.inline_data?.data;
          const mimeType = part.inlineData?.mimeType || part.inline_data?.mime_type || 'image/jpeg';
          const imageUrl = `data:${mimeType};base64,${imageData}`;
          
          return res.status(200).json({ imageUrl });
        }
      }
    }
    
    throw new Error('No composite image received from the API');
  } catch (error) {
    console.error('Error in composite-single:', error);
    return res.status(500).json({ error: error.message });
  }
}