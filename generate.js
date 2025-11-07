export default async function handler(req, res) {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode, prompt, image } = req.body;

  if (!mode || (mode !== 'text' && mode !== 'image')) {
    return res.status(400).json({ error: 'Invalid mode' });
  }

  if (mode === 'text' && !prompt) {
    return res.status(400).json({ error: 'Prompt is required for text mode' });
  }

  if (mode === 'image' && !image) {
    return res.status(400).json({ error: 'Image is required for image mode' });
  }

  try {
    let enhancedPrompt;
    let contentParts = [];

    if (mode === 'image') {
      // Extract base64 data from uploaded image
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];

      enhancedPrompt = 'Create a detailed, photorealistic monument inspired by this image. The monument should be architectural, grand, and impressive. Transform the elements from this image into a majestic monument structure.';

      contentParts = [
        {
          text: enhancedPrompt
        },
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        }
      ];
    } else {
      // Text mode
      enhancedPrompt = `Create a detailed, photorealistic image of a monument: ${prompt}. The image should be architectural, grand, and impressive.`;
      
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
      return res.status(500).json({ 
        error: data.error?.message || 'Failed to generate image',
        details: data 
      });
    }

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
    
    throw new Error('No image data received from the API');
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}