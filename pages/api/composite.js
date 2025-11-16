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
    let finalPrompt = '';

    if (monumentImage && sceneImage) {
      // BEST CASE: We have both images + detailed prompt
      const monumentBase64 = monumentImage.split(',')[1];
      const monumentMimeType = monumentImage.split(';')[0].split(':')[1];
      
      const sceneBase64 = sceneImage.split(',')[1];
      const sceneMimeType = sceneImage.split(';')[0].split(':')[1];

      const enhancedPrompt = `TASK: Image compositing/photo editing

INPUT IMAGES:
- FIRST IMAGE: A monument/statue (this is what needs to be added)
- SECOND IMAGE: A background scene (this is where to add it)

YOUR JOB: Create ONE single output image that shows the monument from the first image placed into the scene from the second image.

CRITICAL INSTRUCTIONS FOR THE MONUMENT APPEARANCE:
1. Look at the FIRST IMAGE carefully - study the monument's appearance
2. When you place it in the scene, it should look IDENTICAL to how it appears in the first image:
   - Same pose and position
   - Same materials (bronze/stone/etc)
   - Same level of detail
   - Same proportions
   - Same facial features (if person/animal)
   - Same style and finish
3. DO NOT redesign, recreate, or reinterpret the monument
4. DO NOT make a simplified or stylized version
5. DO NOT change how the monument looks
6. Copy the monument's appearance AS-IS from the first image

CRITICAL PLACEMENT INSTRUCTIONS - MONUMENT MUST BE ON GROUND:
✓ The monument MUST be placed ON THE GROUND/SURFACE
✓ The monument must be STANDING on the ground, not floating in air
✓ The BASE of the monument should clearly TOUCH the ground/floor/pavement
✓ The monument should look GROUNDED, STABLE, and HEAVY
✓ Add realistic shadows UNDER and AROUND the monument on the ground
✓ The monument should appear to be resting firmly on the surface
✓ NOT hovering, NOT suspended, NOT floating
✓ Match the ground level perspective

LIGHTING & SHADOW INTEGRATION:
✓ Match the lighting from the scene (sunny, cloudy, indoor, time of day)
✓ Cast shadows from the monument ONTO the ground
✓ Shadow direction should match the scene's light source
✓ Add reflections if ground is wet/shiny
✓ Monument's lighting should match scene's lighting conditions
✓ Proper highlights and shadows on the monument surface

SCENE INTEGRATION:
✓ Use the second image as the background/setting
✓ Keep the scene's existing elements where possible
✓ Monument should fit naturally into the environment
✓ Proper scale and perspective relative to scene
✓ Monument should be the focal point
✓ Make it look like the monument has always been there

OUTPUT REQUIREMENTS:
- Create ONE photorealistic image (not a collage)
- The monument from image 1 placed naturally into scene from image 2
- Monument standing firmly on the ground with shadows
- Professional photograph quality
- Natural and believable integration

Think of this like Photoshop: You're cutting out the monument from image 1 (keeping its exact appearance) and pasting it into image 2, then adding proper shadows and lighting to make it look natural.

Additional context: ${compositePrompt}`;

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
1. IMAGE: A monument/statue
2. TEXT DESCRIPTION: ${compositePrompt}

TASK: Create a photorealistic scene as described in the text, with the monument from the image placed IN that scene.

CRITICAL INSTRUCTIONS:
✓ Monument should look like the one in the provided image
✓ Monument MUST be placed ON THE GROUND, standing firmly
✓ BASE of monument touches the ground
✓ Add realistic shadows UNDER the monument
✓ NOT floating or hovering in air
✓ Integrate naturally with proper lighting and shadows
✓ Monument is stable and grounded

Create the scene described in the text and place the monument naturally within it.`;

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

CRITICAL REQUIREMENTS:
✓ Monument must be ON THE GROUND, standing firmly
✓ Add realistic shadows under and around monument
✓ Monument is the main focal point
✓ Proper lighting, perspective, and scale
✓ Professional, photorealistic quality
✓ Natural integration into environment

The monument should look grounded and stable, not floating.`;

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
            temperature: 0.1,
            topP: 0.8,
            topK: 10,
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