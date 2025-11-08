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
    // Extract base64 data from the image
    const base64Data = image.split(',')[1];
    const mimeType = image.split(';')[0].split(':')[1];

    if (!base64Data) {
      throw new Error('Invalid image format');
    }

    const prompt = 'Describe this scene in detail for the purpose of placing a monument in it. Include information about: the location type (park, plaza, street, city, nature, etc.), lighting conditions (sunny, cloudy, evening, etc.), weather, surrounding elements (buildings, trees, people, vehicles, etc.), ground surface (grass, pavement, sand, etc.), and overall atmosphere. Keep the description concise but detailed, around 2-3 sentences.';

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
            maxOutputTokens: 1024,
            responseMimeType: "text/plain"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error in describe-scene:', data);
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
    console.error('Error in describe-scene:', error);
    return res.status(500).json({ error: error.message || 'Failed to describe scene' });
  }
}