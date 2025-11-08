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

      const enhancedPrompt = `You are provided with THREE inputs:
1. FIRST IMAGE: The monument that must appear in the final result
2. SECOND IMAGE: The scene/background setting
3. TEXT DESCRIPTION: Detailed description of how they should be combined

Here is the detailed description of the final scene:
${compositePrompt}

TASK: Create a photorealistic composite image that:
- Uses visual elements from the monument in the first image
- Uses the scene setting and environment from the second image  
- Follows the detailed description provided
- Places the monument naturally into the scene with proper:
  * Lighting that matches the scene
  * Shadows cast by the monument
  * Correct scale and perspective
  * Natural integration and composition

The monument should look like it actually exists in this location. Make it seamless and photorealistic.`;

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

    } else if (monumentImage) {
      // We have monument image + prompt (text-based scene)
      const monumentBase64 = monumentImage.split(',')[1];
      const monumentMimeType = monumentImage.split(';')[0].split(':')[1];

      const enhancedPrompt = `You are provided with:
1. IMAGE: The monument that must appear in the final result
2. TEXT DESCRIPTION: Detailed description of the complete scene

Here is the description:
${compositePrompt}

TASK: Create a photorealistic image that shows the monument from the provided image placed in the scene described in the text. Follow the description exactly and ensure proper lighting, shadows, and natural integration.`;

      contentParts = [
        {
          inline_data: {
            mime_type: monumentMimeType,
            data: monumentBase64
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
            temperature: 0.9,
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