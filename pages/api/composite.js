export default async function handler(req, res) {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { monumentImage, monumentDescription, sceneMode, sceneDescription, sceneImage } = req.body;

  if (!monumentDescription) {
    return res.status(400).json({ error: 'Monument description is required' });
  }

  if (!sceneMode || (sceneMode !== 'text' && sceneMode !== 'image')) {
    return res.status(400).json({ error: 'Invalid scene mode' });
  }

  if (!sceneDescription) {
    return res.status(400).json({ error: 'Scene description is required' });
  }

  if (sceneMode === 'image' && !sceneImage) {
    return res.status(400).json({ error: 'Scene image is required for image mode' });
  }

  try {
    let contentParts = [];
    let finalPrompt = '';

    if (sceneMode === 'text') {
      // Text-only mode: Generate scene with monument
      if (monumentImage) {
        // If we have the monument image, include it
        const monumentBase64 = monumentImage.split(',')[1];
        const monumentMimeType = monumentImage.split(';')[0].split(':')[1];

        finalPrompt = `Look at this monument image. This is the EXACT monument that must appear in the final image.

Now create a photorealistic image that shows THIS EXACT SAME monument placed in the following scene: ${sceneDescription}

CRITICAL REQUIREMENTS:
- Use the EXACT monument from the image provided - same appearance, materials, details
- Do not recreate or redesign the monument - use it exactly as shown
- Place this monument prominently in the scene described
- Add proper lighting, shadows, and reflections to match the scene
- Make it look like a real photograph of this monument in that location
- The monument should be the main focal point`;

        contentParts = [
          {
            inline_data: {
              mime_type: monumentMimeType,
              data: monumentBase64
            }
          },
          {
            text: finalPrompt
          }
        ];
      } else {
        // Fallback without monument image
        finalPrompt = `Create a photorealistic image showing this monument: ${monumentDescription}

Place it in this scene: ${sceneDescription}

Make the monument prominent and realistic with proper lighting and shadows.`;

        contentParts = [
          {
            text: finalPrompt
          }
        ];
      }
    } else {
      // Image mode: Composite monument into uploaded scene
      const sceneBase64 = sceneImage.split(',')[1];
      const sceneMimeType = sceneImage.split(';')[0].split(':')[1];

      if (monumentImage) {
        // Send BOTH monument image and scene image
        const monumentBase64 = monumentImage.split(',')[1];
        const monumentMimeType = monumentImage.split(';')[0].split(':')[1];

        finalPrompt = `You are given TWO images:
1. FIRST IMAGE: A monument/statue
2. SECOND IMAGE: A scene/background

TASK: Create a NEW photorealistic image that shows the EXACT monument from the first image placed naturally into the scene from the second image.

Scene description: ${sceneDescription}

CRITICAL REQUIREMENTS:
- Take the EXACT monument from the first image - do not recreate or modify it
- Place this monument into the scene from the second image
- The monument should look like it naturally belongs in that scene
- Add realistic lighting that matches the scene's lighting
- Add proper shadows cast by the monument onto the ground/surroundings
- Adjust the monument's size and perspective to fit naturally in the scene
- Make it look like a real photograph where this monument actually exists in this location
- The final image should be seamless and photorealistic`;

        contentParts = [
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
            text: finalPrompt
          }
        ];
      } else {
        // Fallback without monument image - use description only
        finalPrompt = `Look at this scene image: ${sceneDescription}

Create a new version of this scene with this monument added: ${monumentDescription}

Place the monument naturally with proper lighting and shadows.`;

        contentParts = [
          {
            inline_data: {
              mime_type: sceneMimeType,
              data: sceneBase64
            }
          },
          {
            text: finalPrompt
          }
        ];
      }
    }

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
            topP: 0.95,
            topK: 40,
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
        error: data.error?.message || 'Failed to create final image',
        details: data 
      });
    }

    // Extract generated image
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
    console.error('Error in composite:', error);
    return res.status(500).json({ error: error.message });
  }
}