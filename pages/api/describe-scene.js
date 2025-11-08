export default async function handler(req, res) {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image is required' });
  }

  try {
    const base64Data = image.split(',')[1];
    const mimeType = image.split(';')[0].split(':')[1];

    const prompt = 'Describe this scene in detail for the purpose of placing a monument in it. Include information about: the location type (park, plaza, street, etc.), lighting conditions, weather, surrounding elements (buildings, trees, people), ground surface, and overall atmosphere. Keep the description concise but detailed, around 2-3 sentences.';

    const contentParts = [
      {
        inline_data: {
          mime_type: mimeType,
          data: base64Data
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
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 1024
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ 
        error: data.error?.message || 'Failed to describe scene',
        details: data 
      });
    }

    // Extract text description
    let description = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.text) {
          description = part.text.trim();
          break;
        }
      }
    }

    if (!description) {
      throw new Error('No description received from the API');
    }

    return res.status(200).json({ description });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}