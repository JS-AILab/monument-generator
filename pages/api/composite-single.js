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
- Accurately preserve identity features of the subject, including facial structure, expression, posture, clothing details, and any defining attributes.
- Style: Monument should appear large and impactful, made of bronze, stone, metal, or marble. Choose material based on what fits the setting.
- Keep pose natural and proportional to the subject’s original posture.
- Avoid stylizing the subject beyond what would be normal for sculpture form.

PLACEMENT & CONTEXT:
- Integrate the monument seamlessly into the SECOND IMAGE’s environment.
- Place monument firmly on the ground; no floating or misalignments.
- Ensure proper scale relative to objects and buildings in the scene.
- Adapt the base/platform of the monument to match scene architecture and ground texture.
- Respect cultural or environmental cues present in the scene.

LIGHTING & REALISM:
- Match lighting, shadows, and perspective to the SECOND IMAGE.
- Cast shadows consistently based on light direction, time of day.
- Apply realistic surface reflections and highlights based on material type.

CONSTRAINTS:
- Do not add new objects (e.g., plaques, text, crowds, flowers) unless they are already present in the input images.
- Do not alter the rest of the scene. Keep all scene elements intact.

OUTPUT REQUIREMENTS:
- Provide only 1 image.
- Resolution must match the realism and quality expected from a professional monument photo.
- Focus on realism, identity preservation, and seamless environmental integration.

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