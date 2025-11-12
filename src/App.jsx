import React, { useState } from 'react';
import { Camera, Loader2, Download, Upload, X, Type, Image, Share2, Edit } from 'lucide-react';

export default function MonumentGenerator() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('text');
  const [prompt, setPrompt] = useState('');
  const [monumentUrl, setMonumentUrl] = useState('');
  const [monumentDescription, setMonumentDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState('');
  
  // Step 2 states
  const [sceneMode, setSceneMode] = useState('text');
  const [scenePrompt, setScenePrompt] = useState('');
  const [sceneImage, setSceneImage] = useState(null);
  const [sceneImagePreview, setSceneImagePreview] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  const [describingScene, setDescribingScene] = useState(false);
  const [finalImage, setFinalImage] = useState('');
  const [compositing, setCompositing] = useState(false);
  // Add this state variable with the other state declarations at the top
const [compositePrompt, setCompositePrompt] = useState('');
const [generatingPrompt, setGeneratingPrompt] = useState(false);

  // Helper function to compress images
  const compressImage = (base64Image, maxWidth = 800) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = base64Image;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError('Image size should be less than 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageData = reader.result;
      setUploadedImagePreview(imageData);
      
      try {
        // Compress image before storing
        const compressedImage = await compressImage(imageData, 1024);
        setUploadedImage(compressedImage);
        setError('');
      } catch (err) {
        console.error('Error compressing image:', err);
        setUploadedImage(imageData); // Fallback to original
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSceneUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError('Image size should be less than 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageData = reader.result;
      setSceneImagePreview(imageData); // Original for display
      setError('');
      
      try {
        // Compress image before sending to API
        const compressedImage = await compressImage(imageData, 800);
        setSceneImage(compressedImage);
        
        // Try to auto-describe with compressed image
        await describeScene(compressedImage);
      } catch (err) {
        console.error('Error processing image:', err);
        setError('Error processing image. Please try again.');
      }
    };
    reader.readAsDataURL(file);
  };

  const describeScene = async (imageData) => {
  setDescribingScene(true);
  setSceneDescription('');
  setCompositePrompt('');
  
  try {
    // Step 1: Describe the scene
    const response = await fetch('/api/describe-scene', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Describe scene error:', data);
      throw new Error(data.error || 'Failed to describe scene');
    }

    if (data.description) {
      setSceneDescription(data.description);
      
      // Step 2: Generate composite prompt automatically
      await generateCompositePrompt(data.description);
    } else {
      throw new Error('No description received');
    }
  } catch (err) {
    console.error('Error describing scene:', err);
    setError(`Could not auto-describe scene: ${err.message}. Please describe it manually.`);
    setSceneDescription('Describe your scene here...');
  } finally {
    setDescribingScene(false);
  }
};

const generateCompositePrompt = async (sceneDesc) => {
  if (!monumentDescription) {
    console.error('No monument description available');
    setCompositePrompt(`${sceneDesc}. In this scene, there is a monument.`);
    return;
  }

  setGeneratingPrompt(true);
  
  try {
    const response = await fetch('/api/generate-composite-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        monumentDescription: monumentDescription,
        sceneDescription: sceneDesc
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Generate prompt error:', data);
      throw new Error(data.error || 'Failed to generate composite prompt');
    }

    if (data.compositePrompt) {
      setCompositePrompt(data.compositePrompt);
    } else {
      throw new Error('No composite prompt received');
    }
  } catch (err) {
    console.error('Error generating composite prompt:', err);
    // Provide a detailed fallback
    const fallbackPrompt = `A photorealistic scene: ${sceneDesc}. In the center of this scene stands ${monumentDescription}. The monument is the main focal point, positioned prominently with realistic lighting conditions matching the scene. Shadows are cast naturally on the surrounding ground. The scale and perspective of the monument fit naturally within the environment. The overall composition is balanced and professional.`;
    setCompositePrompt(fallbackPrompt);
    setError('Using fallback description. You can edit it before generating.');
  } finally {
    setGeneratingPrompt(false);
  }
};

  const removeUploadedImage = () => {
    setUploadedImage(null);
    setUploadedImagePreview('');
  };

  const removeSceneImage = () => {
  setSceneImage(null);
  setSceneImagePreview('');
  setSceneDescription('');
  setCompositePrompt('');  // Added
};

  const switchMode = (newMode) => {
    if (newMode === 'text') {
      setUploadedImage(null);
      setUploadedImagePreview('');
    } else {
      setPrompt('');
    }
    setMode(newMode);
    setError('');
    setMonumentUrl('');
    setMonumentDescription('');
  };

  const switchSceneMode = (newMode) => {
  setSceneMode(newMode);
  setScenePrompt('');
  setSceneImage(null);
  setSceneImagePreview('');
  setSceneDescription('');
  setCompositePrompt('');  // Added
  setError('');
};

const generateMonument = async () => {
  if (mode === 'text' && !prompt.trim()) {
    setError('Please enter a monument description');
    return;
  }

  if (mode === 'image' && !uploadedImage) {
    setError('Please upload an image');
    return;
  }

  setLoading(true);
  setError('');
  setMonumentUrl('');
  setMonumentDescription('');

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: mode,
        prompt: mode === 'text' ? prompt : null,
        image: mode === 'image' ? uploadedImage : null
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate monument');
    }

    if (data.imageUrl) {
      // Compress the monument image before storing for Step 2
      try {
        const compressedMonument = await compressImage(data.imageUrl, 800);
        setMonumentUrl(compressedMonument); // Store compressed version
      } catch (compressErr) {
        console.error('Error compressing monument:', compressErr);
        setMonumentUrl(data.imageUrl); // Fallback to original
      }
      
      setMonumentDescription(data.description || (mode === 'text' ? prompt : 'A monument based on the uploaded image'));
    } else {
      throw new Error('No image data received');
    }
  } catch (err) {
    setError(err.message || 'Failed to generate monument. Please try again.');
    console.error('Error:', err);
  } finally {
    setLoading(false);
  }
};
 const compositeImages = async () => {
  if (sceneMode === 'text' && !scenePrompt.trim()) {
    setError('Please describe the scene');
    return;
  }

  if (sceneMode === 'image' && !sceneImage) {
    setError('Please upload a scene image');
    return;
  }

  // Build composite prompt if not already set
  let finalCompositePrompt = '';
  
  if (sceneMode === 'text') {
    // Text mode: Simple combination
    finalCompositePrompt = `A photorealistic scene: ${scenePrompt}. In this scene, prominently placed is ${monumentDescription}. The monument should be the focal point with proper lighting, shadows, and integration into the environment.`;
  } else {
    // Image mode: Use generated composite prompt or create fallback
    if (compositePrompt.trim()) {
      finalCompositePrompt = compositePrompt;
    } else {
      // Fallback if composite prompt generation failed
      finalCompositePrompt = `A photorealistic scene: ${sceneDescription}. In the center of this scene stands ${monumentDescription}. The monument is prominently displayed with realistic lighting, shadows cast on the ground, and proper scale and perspective matching the environment.`;
    }
  }

  if (!finalCompositePrompt.trim()) {
    setError('Could not generate scene description. Please try again.');
    return;
  }

  setCompositing(true);
  setError('');
  setFinalImage('');

  try {
    // Prepare payload with images AND text prompt
    const payload = {
      compositePrompt: finalCompositePrompt,
      monumentImage: monumentUrl,  // Always send monument image
      sceneImage: sceneMode === 'image' ? sceneImage : null  // Send scene image only in image mode
    };

    console.log('Sending to composite API:', {
      hasMonumentImage: !!payload.monumentImage,
      hasSceneImage: !!payload.sceneImage,
      promptLength: payload.compositePrompt.length
    });

    const response = await fetch('/api/composite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to composite images');
    }

    const data = await response.json();

    if (data.imageUrl) {
      setFinalImage(data.imageUrl);
    } else {
      throw new Error('No final image received');
    }
  } catch (err) {
    setError(err.message || 'Failed to create final image. Please try again.');
    console.error('Error:', err);
  } finally {
    setCompositing(false);
  }
};
  const shareImage = async () => {
  if (!finalImage) return;

  try {
    // Check if Web Share API is supported
    if (!navigator.share) {
      // Fallback: Just download the image
      downloadImage(finalImage, `monument-final-${Date.now()}.jpg`);
      alert('Sharing not supported on this browser. Image has been downloaded instead!');
      return;
    }

    // Convert base64 to blob
    const base64Response = await fetch(finalImage);
    const blob = await base64Response.blob();
    
    // Create file from blob
    const file = new File([blob], `monument-${Date.now()}.jpg`, { 
      type: 'image/jpeg',
      lastModified: new Date().getTime()
    });

    // Check if we can share files
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'My Monument Creation',
        text: 'Check out this amazing monument I created with AI!'
      });
    } else {
      // Fallback: Share without file (just text and URL if available)
      await navigator.share({
        title: 'My Monument Creation',
        text: 'Check out this amazing monument I created with AI! Download to see the full image.'
      });
      
      // Also download the image
      downloadImage(finalImage, `monument-final-${Date.now()}.jpg`);
    }
  } catch (err) {
    // User cancelled or error occurred
    if (err.name === 'AbortError') {
      console.log('Share cancelled by user');
      return;
    }
    
    console.error('Error sharing:', err);
    // Fallback to download
    downloadImage(finalImage, `monument-final-${Date.now()}.jpg`);
    setError('Could not share image. Image has been downloaded instead!');
    
    // Clear error after 3 seconds
    setTimeout(() => setError(''), 3000);
  }
};

  const resetAndStartOver = () => {
  setStep(1);
  setMode('text');
  setPrompt('');
  setMonumentUrl('');
  setMonumentDescription('');
  setUploadedImage(null);
  setUploadedImagePreview('');
  setSceneMode('text');
  setScenePrompt('');
  setSceneImage(null);
  setSceneImagePreview('');
  setSceneDescription('');
  setCompositePrompt('');  // Added
  setFinalImage('');
  setError('');
};

  return (
   <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
  <Camera className="w-10 h-10 text-blue-600" />
  <h1 className="text-4xl font-bold text-gray-800">Monument Generator</h1>
</div>
<p className="text-gray-600">Create stunning monument images using AI - powered by Google Gemini</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-blue-600' : 'text-gray-500'}`}>
  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              1
            </div>
            <span className="font-semibold">Create Monument</span>
          </div>
          <div className="w-12 h-0.5 bg-purple-600"></div>
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-white' : 'text-purple-300'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 2 ? 'bg-purple-600' : 'bg-purple-800'}`}>
              2
            </div>
            <span className="font-semibold">Add to Scene</span>
          </div>
        </div>

        {/* STEP 1: Create Monument */}
        {step === 1 && (
          <>
            {/* Mode Selector */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 mb-6 border border-purple-400/30 flex gap-2">
              <button
                onClick={() => switchMode('text')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  mode === 'text'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-200 hover:bg-white/10'
                }`}
              >
                <Type className="w-5 h-5" />
                Text Description
              </button>
              <button
                onClick={() => switchMode('image')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  mode === 'image'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-200 hover:bg-white/10'
                }`}
              >
                <Image className="w-5 h-5" />
                Upload Image
              </button>
            </div>

            {/* Text Mode */}
            {mode === 'text' && (
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6 border border-purple-400/30">
                <label className="block text-white font-semibold mb-2">
                  Describe Your Monument
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g., A futuristic glass monument in the shape of a phoenix rising from flames..."
                  className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-purple-300 border border-purple-400/30 focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-32 resize-y"
                />
              </div>
            )}

            {/* Image Mode */}
            {mode === 'image' && (
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6 border border-purple-400/30">
                <label className="block text-white font-semibold mb-2">
                  Upload Reference Image
                </label>
                
                {!uploadedImagePreview ? (
                  <div className="border-2 border-dashed border-purple-400/50 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 text-purple-300 mx-auto mb-3" />
                      <p className="text-purple-200 mb-1">Click to upload an image</p>
                      <p className="text-purple-300 text-sm">PNG, JPG, GIF up to 4MB</p>
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={uploadedImagePreview}
                      alt="Uploaded reference"
                      className="w-full h-64 object-contain rounded-lg bg-black/20"
                    />
                    <button
                      onClick={removeUploadedImage}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Generate Monument Button */}
            <button
              onClick={generateMonument}
              disabled={loading || (mode === 'text' && !prompt.trim()) || (mode === 'image' && !uploadedImage)}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 mb-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Monument...
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  Generate Monument
                </>
              )}
            </button>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                <p className="text-red-200">{error}</p>
              </div>
            )}

            {monumentUrl && (
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-purple-400/30">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Your Monument</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadImage(monumentUrl, `monument-${Date.now()}.jpg`)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Next Step →
                    </button>
                  </div>
                </div>
                <img
                  src={monumentUrl}
                  alt="Generated monument"
                  className="w-full rounded-lg shadow-2xl"
                />
              </div>
            )}

            <div className="mt-8 text-center text-purple-300 text-sm">
              <p>💡 Tip: {mode === 'text' ? 'Be specific with architectural details, materials, and setting' : 'Upload a clear reference image to inspire your monument'}</p>
            </div>
          </>
        )}

        {/* STEP 2: Add Monument to Scene */}
        {step === 2 && (
          <>
            {/* Monument Preview */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 mb-6 border border-purple-400/30">
              <h3 className="text-lg font-semibold text-white mb-3">Your Monument</h3>
              <img
                src={monumentUrl}
                alt="Generated monument"
                className="w-full max-h-48 object-contain rounded-lg"
              />
            </div>

            {/* Scene Mode Selector */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 mb-6 border border-purple-400/30 flex gap-2">
              <button
                onClick={() => switchSceneMode('text')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  sceneMode === 'text'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-200 hover:bg-white/10'
                }`}
              >
                <Type className="w-5 h-5" />
                Describe Scene
              </button>
              <button
                onClick={() => switchSceneMode('image')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  sceneMode === 'image'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-200 hover:bg-white/10'
                }`}
              >
                <Image className="w-5 h-5" />
                Upload Scene
              </button>
            </div>

            {/* Scene Text Mode */}
            {sceneMode === 'text' && (
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6 border border-purple-400/30">
                <label className="block text-white font-semibold mb-2">
                  Describe the Scene
                </label>
                <p className="text-purple-200 text-sm mb-3">
                  Describe where you want to place your monument
                </p>
                <textarea
                  value={scenePrompt}
                  onChange={(e) => setScenePrompt(e.target.value)}
                  placeholder="E.g., A sunny park with green grass, tall trees in the background, a clear blue sky, and people walking on pathways..."
                  className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-purple-300 border border-purple-400/30 focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-32 resize-y"
                />
              </div>
            )}

            {/* Scene Image Mode */}
            {/* Scene Image Mode */}
{sceneMode === 'image' && (
  <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6 border border-purple-400/30">
    <label className="block text-white font-semibold mb-2">
      Upload Scene Image
    </label>
    <p className="text-purple-200 text-sm mb-3">
      Upload a background scene where you want to place your monument
    </p>
    
    {!sceneImagePreview ? (
      <div className="border-2 border-dashed border-purple-400/50 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer">
        <input
          type="file"
          accept="image/*"
          onChange={handleSceneUpload}
          className="hidden"
          id="scene-upload"
        />
        <label htmlFor="scene-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 text-purple-300 mx-auto mb-3" />
          <p className="text-purple-200 mb-1">Click to upload a scene</p>
          <p className="text-purple-300 text-sm">PNG, JPG, GIF up to 4MB</p>
        </label>
      </div>
    ) : (
      <>
        <div className="relative mb-4">
          <img
            src={sceneImagePreview}
            alt="Scene background"
            className="w-full h-64 object-contain rounded-lg bg-black/20"
          />
          <button
            onClick={removeSceneImage}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scene Description (for reference) */}
        {sceneDescription && (
          <div className="mb-4">
            <label className="block text-white font-semibold mb-2">
              Scene Analysis:
            </label>
            <div className="px-4 py-3 rounded-lg bg-white/10 text-purple-200 text-sm border border-purple-400/20">
              {sceneDescription}
            </div>
          </div>
        )}

        {/* Composite Description (main editable field) */}
        <div>
          <label className="block text-white font-semibold mb-2 flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Complete Scene Description (editable)
          </label>
          <p className="text-purple-200 text-sm mb-2">
            This describes the final scene with your monument in it
          </p>
          {describingScene || generatingPrompt ? (
            <div className="flex items-center gap-2 text-purple-200 py-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {describingScene ? 'Analyzing scene...' : 'Creating composite description...'}
              </span>
            </div>
          ) : (
            <textarea
              value={compositePrompt}
              onChange={(e) => setCompositePrompt(e.target.value)}
              placeholder="AI will generate a complete description combining your monument and scene..."
              className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-purple-300 border border-purple-400/30 focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-32 resize-y"
            />
          )}
        </div>
      </>
    )}
  </div>
)}
                    

            {/* Action Buttons */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                ← Back
              </button>
             <button
  onClick={compositeImages}
  disabled={
    compositing || 
    (sceneMode === 'text' && !scenePrompt.trim()) || 
    (sceneMode === 'image' && !sceneImage)
  }
  className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
>
                {compositing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Final Image...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    Generate Final Image
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                <p className="text-red-200">{error}</p>
              </div>
            )}

            {/* Final Result */}
            {finalImage && (
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-purple-400/30">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Final Creation</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={shareImage}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                    <button
                      onClick={() => downloadImage(finalImage, `monument-final-${Date.now()}.jpg`)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
                <img
                  src={finalImage}
                  alt="Final monument in scene"
                  className="w-full rounded-lg shadow-2xl mb-4"
                />
                <button
                  onClick={resetAndStartOver}
                  className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  Create Another Monument
                </button>
              </div>
            )}

            <div className="mt-8 text-center text-purple-300 text-sm">
              <p>💡 Tip: {sceneMode === 'text' ? 'Be descriptive about lighting, weather, and surroundings' : 'You can edit the AI-generated scene description before creating the final image'}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}