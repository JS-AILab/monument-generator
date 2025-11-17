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

TASK TYPE: IMAGE INSERTION / PHOTO EDITING (NOT IMAGE GENERATION)

1. The Absolute Background Lock
"THE SECOND UPLOADED IMAGE IS A FIXED AND UNALTERABLE CANVAS. You are permitted only to ADD a new element to this canvas. You MUST NOT change, alter, re-compose, re-frame, or zoom in on the SECOND IMAGE'S existing background. The final image must contain 100% of the scene shown in the SECOND IMAGE, keeping the original camera angle and aspect ratio intact."
2. Monument & Smart Placement
"Create a photorealistic monument of the person from the FIRST IMAGE
The monument must be intelligently placed in the most logical and proportional focal point of the scene. It MUST be firmly grounded and its size MUST be realistic relative to the environment (not too small, not too large).
3. Cohesion & Final Output
"Ensure the monument's lighting, shadows, and perspective are seamlessly and perfectly matched to the preserved background's conditions. The output is a single, realistic photograph that is indistinguishable from a picture taken in that exact spot."

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
            temperature: 0.1,
            topP: 0.8,
            topK: 10,
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