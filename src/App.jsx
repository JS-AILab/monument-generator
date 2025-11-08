import React, { useState } from 'react';
import { Camera, Loader2, Download, Upload, X, Type, Image, Share2 } from 'lucide-react';

export default function MonumentGenerator() {
  const [step, setStep] = useState(1); // 1 or 2
  const [mode, setMode] = useState('text'); // 'text' or 'image'
  const [prompt, setPrompt] = useState('');
  const [monumentUrl, setMonumentUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState('');
  
  // Step 2 states
  const [sceneImage, setSceneImage] = useState(null);
  const [sceneImagePreview, setSceneImagePreview] = useState('');
  const [finalImage, setFinalImage] = useState('');
  const [compositing, setCompositing] = useState(false);

  const handleImageUpload = (e) => {
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
    reader.onloadend = () => {
      setUploadedImage(reader.result);
      setUploadedImagePreview(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSceneUpload = (e) => {
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
    reader.onloadend = () => {
      setSceneImage(reader.result);
      setSceneImagePreview(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
    setUploadedImagePreview('');
  };

  const removeSceneImage = () => {
    setSceneImage(null);
    setSceneImagePreview('');
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setPrompt('');
    setUploadedImage(null);
    setUploadedImagePreview('');
    setError('');
    setMonumentUrl('');
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
        setMonumentUrl(data.imageUrl);
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
    if (!monumentUrl || !sceneImage) {
      setError('Please make sure you have both a monument and scene image');
      return;
    }

    setCompositing(true);
    setError('');
    setFinalImage('');

    try {
      const response = await fetch('/api/composite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monumentImage: monumentUrl,
          sceneImage: sceneImage
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to composite images');
      }

      if (data.imageUrl) {
        setFinalImage(data.imageUrl);
      } else {
        throw new Error('No final image received');
      }
    } catch (err) {
      setError(err.message || 'Failed to composite images. Please try again.');
      console.error('Error:', err);
    } finally {
      setCompositing(false);
    }
  };

  const downloadImage = (imageUrl, filename) => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareImage = async () => {
    if (!finalImage) return;

    try {
      // Convert base64 to blob
      const response = await fetch(finalImage);
      const blob = await response.blob();
      const file = new File([blob], 'monument.jpg', { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Monument Creation',
          text: 'Check out this monument I created!'
        });
      } else {
        // Fallback: copy link or download
        setError('Sharing not supported on this device. Please use the download button.');
      }
    } catch (err) {
      console.error('Error sharing:', err);
      setError('Could not share image. Please try downloading instead.');
    }
  };

  const resetAndStartOver = () => {
    setStep(1);
    setMode('text');
    setPrompt('');
    setMonumentUrl('');
    setUploadedImage(null);
    setUploadedImagePreview('');
    setSceneImage(null);
    setSceneImagePreview('');
    setFinalImage('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Camera className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">Monument Generator</h1>
          </div>
          <p className="text-purple-200">Create stunning monument images using AI - powered by Google Gemini</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-white' : 'text-purple-300'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 1 ? 'bg-purple-600' : 'bg-purple-800'}`}>
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
                  placeholder="E.g., A futuristic glass monument in the shape of a phoenix rising from flames, located in a modern city plaza..."
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
              <p>💡 Tip: {mode === 'text' ? 'Be specific with architectural details, materials, and setting for best results' : 'Upload a clear reference image to inspire your monument design'}</p>
            </div>
          </>
        )}

        {/* STEP 2: Add Monument to Scene */}
        {step === 2 && (
          <>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6 border border-purple-400/30">
              <h2 className="text-xl font-semibold text-white mb-4">Your Generated Monument</h2>
              <img
                src={monumentUrl}
                alt="Generated monument"
                className="w-full rounded-lg shadow-lg mb-4"
              />
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6 border border-purple-400/30">
              <label className="block text-white font-semibold mb-2">
                Upload Scene Image
              </label>
              <p className="text-purple-200 text-sm mb-4">
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
                <div className="relative">
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
              )}
            </div>

            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={compositeImages}
                disabled={compositing || !sceneImage}
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
                    Create Final Image
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                <p className="text-red-200">{error}</p>
              </div>
            )}

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
              <p>💡 Tip: Choose a scene that complements your monument for the best results</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}