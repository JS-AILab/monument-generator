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
    let monumentDescription = '';

    if (mode === 'image') {
      // Extract base64 data from uploaded image
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];

      // VERY EXPLICIT PROMPT - Monument must be OF the image content
      enhancedPrompt = 'IMPORTANT: Look carefully at this image and identify what you see - whether it is a person, animal, object, building, or scene. Create a grand, impressive MONUMENT or STATUE that depicts EXACTLY what you see in this image. The monument should be a 3D sculpture made of materials like bronze, marble, stone, or metal. The statue/monument MUST show the same subject (person, animal, or object) that appears in the uploaded image. For example: if you see a dog, create a dog statue/monument; if you see a person, create a statue of that person; if you see the Eiffel Tower, create a monument version of the Eiffel Tower. The monument should be photorealistic, architectural, and placed in an appropriate setting like a plaza or park. DO NOT create something unrelated - the monument MUST represent what is in this image.';

      monumentDescription = 'A grand architectural monument statue depicting the subject from the uploaded image, made of bronze or stone';

      contentParts = [
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        },
        {
          text: enhancedPrompt
        }
      ];
    } else {
      // Text mode
      enhancedPrompt = `Create a detailed, photorealistic image of a monument: ${prompt}. The image should be architectural, grand, and impressive.`;
      monumentDescription = prompt;
      
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
            temperature: 0.8,
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
        error: data.error?.message || 'Failed to generate image',
        details: data 
      });
    }

    // Look through all parts for an image
    let foundImage = false;
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData || part.inline_data) {
          const imageData = part.inlineData?.data || part.inline_data?.data;
          const mimeType = part.inlineData?.mimeType || part.inline_data?.mime_type || 'image/jpeg';
          const imageUrl = `data:${mimeType};base64,${imageData}`;
          
          return res.status(200).json({ 
            imageUrl: imageUrl,
            description: monumentDescription 
          });
        }
      }
    }
    
    throw new Error('No image data received from the API');
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}