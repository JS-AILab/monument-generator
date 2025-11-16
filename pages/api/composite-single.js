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

MONUMENT CREATION:
- Study the FIRST IMAGE closely to extract identity: facial features, pose, gesture, clothing details, or key design elements.
- Create a monument statute based on the subject. If human, turn them into a standing statue. If animal or object, replicate it as a monument.
- Material: Use appropriate sculpture material (e.g., bronze, marble, stone, or metal).
- Style: Detailed and realistic. Avoid cartoon or stylized effects.

PLACEMENT IN SCENE:
- Place the monument FIRMLY on the ground in the setting of the SECOND IMAGE.
- The base of the monument must be aligned with the environment. It should not float.
- Cast realistic shadows and effects based on light direction in the scene.
- Match perspective, scale, and lighting based on the SECOND IMAGE.

SCENE PRESERVATION & FRAMING (IMPORTANT):
- Maintain the full context of the SECOND IMAGE.
- Use a wide-angle or medium-wide shot. DO NOT zoom in too closely—it must not crop out the environment.
- Keep buildings, landscape, or features in the SECOND IMAGE clearly visible.
- The monument should be prominent, but the surrounding scene MUST stay recognizable.
- Do NOT alter or remove elements from the original scene.

LIGHTING & REALISM:
- Match time of day, light direction, shadows, and ambient lighting.
- Apply realistic highlights and material textures.
- The monument must look naturally part of the environment (no harsh edges, mismatched tones, or mismatched shadows).

RESTRICTIONS:
- Do NOT add or invent new elements (e.g., plaques, crowds, text, banners, flowers) unless already present.
- Do NOT generate close-ups, alternative frames, cutaways, or standalone statue renderings. A full-scene shot is required.
- Do NOT crop, zoom, or remove scene context.
- The output must not be stylized like a concept art or cartoon. It must look like a real photograph.

OUTPUT:
- ONE final image.
- A wide/medium-wide shot of the monument, fully integrated into the original scene.
- Monument is accurately based on the FIRST IMAGE and fully placed in the SECOND IMAGE location.
- Scene context preserved with realistic shadows, perspective, and lighting.


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