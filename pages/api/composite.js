export default async function handler(req, res) {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { compositePrompt, monumentImage, sceneImage } = req.body;

  if (!compositePrompt) {
    return res.status(400).json({ error: 'Composite prompt is required' });
  }

  try {
    let contentParts = [];

    // Build content parts based on what images are available
if (monumentImage && sceneImage) {
  // BEST CASE: We have both images + detailed prompt
  const monumentBase64 = monumentImage.split(',')[1];
  const monumentMimeType = monumentImage.split(';')[0].split(':')[1];
  
  const sceneBase64 = sceneImage.split(',')[1];
  const sceneMimeType = sceneImage.split(';')[0].split(':')[1];

  const enhancedPrompt = `You are provided with:
1. FIRST IMAGE: A monument/statue
2. SECOND IMAGE: A scene/location
3. DESCRIPTION: ${compositePrompt}

TASK: Create a photorealistic image showing the monument from image 1 placed naturally IN the scene from image 2.

CRITICAL PLACEMENT REQUIREMENTS:
✓ The monument MUST be placed ON THE GROUND/SURFACE
✓ The monument must be STANDING on the ground, not floating in air
✓ The BASE of the monument should touch the ground/floor/pavement
✓ Add realistic shadows UNDER and AROUND the monument
✓ The monument should look GROUNDED and stable
✓ Match the perspective - if scene is at eye level, monument should be at eye level
✓ The monument should be integrated INTO the scene, not pasted on top

LIGHTING & INTEGRATION:
✓ Match the lighting from the scene (sunny, cloudy, indoor, etc.)
✓ Cast shadows from the monument onto the ground
✓ The monument's lighting should match the scene's light direction
✓ Add reflections if ground is wet/shiny
✓ Blend the monument naturally with its surroundings

SCENE PRESERVATION:
✓ Keep the original scene's elements (buildings, trees, sky, etc.)
✓ Do not drastically change the scene
✓ Only add the monument and its shadows

THINK OF IT AS:
- The monument is a real, heavy sculpture that sits firmly on the ground
- NOT floating, NOT hovering, NOT suspended in air
- Placed naturally like it's been there permanently

The result should look like a real photograph of an actual monument that exists in that location.`;

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
      text: enhancedPrompt
    }
  ];
} else {
      // Fallback: Text only (if images failed to send)
      const enhancedPrompt = `Create a photorealistic image based on this detailed description:

${compositePrompt}

The image should be highly detailed, properly lit with realistic shadows, and compositionally balanced. The monument should be the prominent focal point.`;

      contentParts = [
        {
          text: enhancedPrompt
        }
      ];
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
  temperature: 0.5,  // Lower for more accuracy to original scene
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