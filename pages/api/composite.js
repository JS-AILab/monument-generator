export default async function handler(req, res) {
  // Increase body size limit
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { monumentImage, sceneImage } = req.body;

  if (!monumentImage || !sceneImage) {
    return res.status(400).json({ error: 'Both monument and scene images are required' });
  }

  try {
    // Helper function to compress base64 image if needed
    const getBase64Data = (dataUrl) => {
      if (!dataUrl) return null;
      const parts = dataUrl.split(',');
      if (parts.length !== 2) return null;
      return parts[1];
    };

    const getMimeType = (dataUrl) => {
      if (!dataUrl) return 'image/jpeg';
      const match = dataUrl.match(/^data:([^;]+);/);
      return match ? match[1] : 'image/jpeg';
    };

    const monumentBase64 = getBase64Data(monumentImage);
    const monumentMimeType = getMimeType(monumentImage);
    
    const sceneBase64 = getBase64Data(sceneImage);
    const sceneMimeType = getMimeType(sceneImage);

    if (!monumentBase64 || !sceneBase64) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    const prompt = 'Composite these two images together seamlessly. Take the monument from the first image and naturally place it into the scene from the second image. Make sure the monument fits realistically into the scene with proper lighting, shadows, perspective, and scale. The final result should look photorealistic as if the monument actually exists in that location. Blend the images perfectly so they look like one cohesive photograph.';

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
        error: data.error?.message || 'Failed to composite images',
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
    
    throw new Error('No composite image received from the API');
  } catch (error) {
    console.error('Error in composite:', error);
    return res.status(500).json({ error: error.message });
  }
}