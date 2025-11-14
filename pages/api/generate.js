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

  // STEP 1: Create ONLY the monument - NO SCENE, NO BACKGROUND
  enhancedPrompt = `CRITICAL INSTRUCTION: Analyze this image VERY CAREFULLY. Identify EXACTLY what you see.

If you see a WOMAN or FEMALE PERSON:
- Create a monument/statue of THAT EXACT WOMAN
- The monument must depict a FEMALE person
- Capture her pose, appearance, and features as a statue

If you see a MAN or MALE PERSON:
- Create a monument/statue of THAT EXACT MAN
- The monument must depict a MALE person

If you see a DOG:
- Create a dog statue/monument

If you see a CAT:
- Create a cat statue/monument

If you see ANY OTHER SUBJECT:
- Create a monument of THAT EXACT SUBJECT

ABSOLUTELY CRITICAL RULES:
1. Look at the image FIRST before creating anything
2. The monument MUST match what you see in the image
3. If you see a woman, DO NOT create a dog or any other animal
4. If you see a man, DO NOT create a woman or animal
5. The subject in the monument MUST be the SAME as the subject in the uploaded image
6. Create ONLY the monument/statue on a plain neutral background
7. NO parks, plazas, or environmental elements
8. Made of bronze, marble, stone, or metal
9. Detailed, 3D, realistic sculpture

DO NOT:
- Change the subject (woman → dog, man → cat, etc.)
- Add background scenes
- Create something different from what you see

Describe the monument you create, including what subject it depicts.`;

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

  monumentDescription = 'A  monument statue depicting the subject from the uploaded image, made of bronze or stone, detailed and impressive';

    } else {
      // TEXT MODE: Create ONLY monument from text description - NO SCENE
      enhancedPrompt = `Create a detailed, photorealistic monument: ${prompt}

CRITICAL REQUIREMENTS:
- Create ONLY the monument/statue itself
- NO background, NO scene, NO setting
- Plain neutral background (white, grey, or minimal)
- The monument should be isolated and clearly visible
- Made of impressive materials like bronze, marble, or stone
- Detailed and realistic sculpture

DO NOT include parks, plazas, pedestals, or any environmental elements. Just the monument.

After creating the image, provide a description of the monument's appearance, materials, size, and features.`;

      monumentDescription = `A  monument: ${prompt}. Made of bronze or stone, impressive and detailed.`;
      
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