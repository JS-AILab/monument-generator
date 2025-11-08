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

      // STEP 1: Create monument FROM the uploaded image
      enhancedPrompt = `IMPORTANT: Look carefully at this image and identify what you see - whether it is a person, animal, object, building, or scene. 

Create a grand, impressive MONUMENT or STATUE that depicts EXACTLY what you see in this image. 

The monument should be:
- A 3D sculpture made of materials like bronze, marble, stone, or metal
- The statue/monument MUST show the same subject (person, animal, or object) that appears in the uploaded image
- For example: if you see a dog, create a dog statue/monument; if you see a person, create a statue of that person; if you see the Eiffel Tower, create a monument version of the Eiffel Tower
- Photorealistic and architectural
- Placed in an appropriate setting like a plaza or park

DO NOT create something unrelated - the monument MUST represent what is in this image.

After creating the image, also provide a detailed text description of the monument you created. Include:
- What subject/object the monument depicts
- What material it's made of (bronze, marble, stone, metal, etc.)
- The size (large, massive, towering, life-size, etc.)
- The pose or position
- Any distinctive architectural or sculptural features
- The style (classical, modern, abstract-realistic, etc.)

This description will help recreate this exact monument in different scenes later.`;

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

      // Default description in case AI doesn't provide text
      monumentDescription = 'A grand architectural monument statue depicting the subject from the uploaded image, made of bronze or stone, towering and impressive, with detailed sculptural features in a classical-modern style';

    } else {
      // TEXT MODE: Create monument from text description
      enhancedPrompt = `Create a detailed, photorealistic image of a monument: ${prompt}. 

The monument should be:
- Architectural and grand
- Made of impressive materials like bronze, marble, or stone
- Placed in an appropriate setting
- Impressive and monumental in scale

Make it look like a real monument that could exist.`;

      // For text mode, use the user's prompt as the description
      monumentDescription = `A grand monument: ${prompt}. Made of bronze or stone, impressive and architectural in scale.`;
      
      contentParts = [
        {
          text: enhancedPrompt
        }
      ];
    }

    // Call Gemini API
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

    // Extract both IMAGE and TEXT description from response
    let imageUrl = null;
    let aiDescription = '';
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      for (const part of data.candidates[0].content.parts) {
        // Extract the generated image
        if (part.inlineData || part.inline_data) {
          const imageData = part.inlineData?.data || part.inline_data?.data;
          const mimeType = part.inlineData?.mimeType || part.inline_data?.mime_type || 'image/jpeg';
          imageUrl = `data:${mimeType};base64,${imageData}`;
        }
        
        // Extract AI's text description of the monument it created
        if (part.text && part.text.trim()) {
          aiDescription = part.text.trim();
        }
      }
    }

    // Must have an image to return
    if (!imageUrl) {
      throw new Error('No image data received from the API');
    }

    // Use AI's description if it provided one, otherwise use our default
    // AI's description is better because it describes what it ACTUALLY created
    const finalDescription = aiDescription && aiDescription.length > 20 
      ? aiDescription 
      : monumentDescription;

    console.log('Monument Description for Step 2:', finalDescription);

    // Return both the image and detailed description
    return res.status(200).json({ 
      imageUrl: imageUrl,
      description: finalDescription 
    });

  } catch (error) {
    console.error('Error in generate:', error);
    return res.status(500).json({ error: error.message });
  }
}