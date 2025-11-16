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

YOU ARE NOT GENERATING A NEW IMAGE.
YOU ARE MODIFYING IMAGE 2 BY ADDING A MONUMENT BASED ON IMAGE 1.

THIS IS AN IMAGE EDITING TASK.
THE BACKGROUND FROM IMAGE 2 MUST REMAIN EXACTLY THE SAME.

IMAGE RULES (DO NOT BREAK THESE):
- Do not generate a new scene
- Do not replace the background
- Do not repaint, redesign, re-render, or reinterpret the environment
- Do not change camera angle, lens, perspective, lighting, or framing
- Do not crop or zoom
- Do not remove any existing objects
- ALL PIXELS IN IMAGE 2 MUST STAY THE SAME except where the statue touches the ground

HARD NON-NEGOTIABLE REQUIREMENTS:
- Use the SECOND IMAGE exactly as the background
- Do NOT replace, modify, repaint, or regenerate the scene
- Do NOT change camera angle, lens, perspective, horizon, composition, or cropping
- ALL original background pixels must remain unless covered by the statue’s base or natural shadow
- The final result must still look exactly like the SECOND IMAGE, not a new location
- If the background does not match the original scene, the output is INCORRECT

INSERTION RULES:
- Add a realistic monument based on the FIRST IMAGE subject
- Preserve identity: face, body shape, clothing, posture, details
- Material: bronze, stone, marble, or metal
- Statue must be firmly grounded in the existing scene surface
- Add natural shadows following the lighting direction of the scene
- Match lighting, texture, depth, and color of the environment

FRAMING / SCENE PRESERVATION:
- Do NOT zoom or crop
- Do NOT output a close-up
- Show the entire original scene clearly
- The statue should take up no more than 30–40% of the frame
- The environment MUST remain recognizable and unchanged

STRICTLY FORBIDDEN:
- Generating a new scene/background
- Changing sky, ground, buildings, foliage, or objects
- Adding new elements like plaques, flags, crowds, banners, or text
- Replacing the environment with a “better” setting
- Converting scene to stylized art or fantasy setting

MONUMENT CREATION:
- Base statue exactly on subject from FIRST IMAGE
- Preserve facial features and clothing
- Proportionate, life-size or larger-than-life acceptable
- Style must be photorealistic

OUTPUT:
ONE photorealistic image
• SECOND IMAGE background preserved pixel-for-pixel except for statue insertion
• Monument appears as if physically built in real location


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