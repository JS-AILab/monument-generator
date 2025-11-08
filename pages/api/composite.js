export default async function handler(req, res) {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { monumentDescription, sceneMode, sceneDescription, sceneImage } = req.body;

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
      // Text-only mode: Generate scene with monument from descriptions
      finalPrompt = `Create a photorealistic image of the following scene: ${sceneDescription}. In this scene, place a monument with these characteristics: ${monumentDescription}. The monument should be naturally integrated into the scene with proper lighting, shadows, perspective, and scale. Make it look like the monument truly belongs in this location. The final image should be cohesive and realistic.`;

      contentParts = [
        {
          text: finalPrompt
        }
      ];
    } else {
      // Image mode: Composite monument into uploaded scene
      const base64Data = sceneImage.split(',')[1];
      const mimeType = sceneImage.split(';')[0].split(':')[1];

      finalPrompt = `Look at this scene image. The scene is described as: ${sceneDescription}. Now, create a new version of this scene but add a monument with these characteristics: ${monumentDescription}. Place the monument naturally into this scene with proper lighting, shadows, perspective, and scale to match the existing environment. The monument should look like it belongs in this location. Make the composite seamless and photorealistic.`;

      contentParts = [
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        },
        {
          text: finalPrompt
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
            temperature: 1,
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
    let foundImage = false;
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