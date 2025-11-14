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

  // UPDATED PROMPT - PRESERVE SCENE EXACTLY
  const enhancedPrompt = `You are provided with THREE inputs:
1. FIRST IMAGE: The monument/statue that must be added
2. SECOND IMAGE: The scene/background (THIS MUST NOT CHANGE)
3. TEXT DESCRIPTION: Details about the composition

Description: ${compositePrompt}

CRITICAL TASK - PRESERVE THE SCENE:
Your job is to take the monument from the first image and place it INTO the second image WITHOUT changing the scene.

STRICT REQUIREMENTS:
✓ USE the EXACT scene from the second image - do NOT recreate it
✓ KEEP all elements in the scene exactly as they are:
  - Same buildings, trees, objects
  - Same colors, lighting, atmosphere  
  - Same perspective and composition
  - Same weather conditions
  - Same people or vehicles (if any)
✓ ONLY ADD the monument from the first image into this existing scene
✓ Place the monument naturally in the scene (center, foreground, or as described)
✓ Add realistic shadows from the monument onto the ground
✓ Match the monument's lighting to the scene's existing lighting
✓ Adjust monument size/scale to fit naturally

DO NOT:
✗ Recreate or redraw the background scene
✗ Change colors, lighting, or atmosphere of the scene
✗ Move or remove existing elements from the scene
✗ Change the perspective or composition
✗ Add new elements to the scene (except the monument)

THINK OF IT AS: Photo editing/compositing - inserting the monument into an existing photograph, NOT generating a new scene.

The result should look like someone Photoshopped the monument into the original scene photo.`;

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