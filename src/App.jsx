import React, { useState } from 'react';
import { Camera, Loader2, Download, Upload, X, Share2 } from 'lucide-react';

export default function MonumentGenerator() {
  const [monumentRefImage, setMonumentRefImage] = useState(null);
  const [monumentRefPreview, setMonumentRefPreview] = useState('');
  const [sceneImage, setSceneImage] = useState(null);
  const [scenePreview, setScenePreview] = useState('');
  const [finalImage, setFinalImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleMonumentUpload = async (e) => {
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
      setMonumentRefPreview(imageData);
      
      try {
        const compressedImage = await compressImage(imageData, 800);
        setMonumentRefImage(compressedImage);
        setError('');
      } catch (err) {
        console.error('Error compressing image:', err);
        setMonumentRefImage(imageData);
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
      setScenePreview(imageData);
      
      try {
        const compressedImage = await compressImage(imageData, 800);
        setSceneImage(compressedImage);
        setError('');
      } catch (err) {
        console.error('Error compressing image:', err);
        setSceneImage(imageData);
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const removeMonumentImage = () => {
    setMonumentRefImage(null);
    setMonumentRefPreview('');
  };

  const removeSceneImage = () => {
    setSceneImage(null);
    setScenePreview('');
  };

  const generateComposite = async () => {
    if (!monumentRefImage) {
      setError('Please upload a monument reference image');
      return;
    }

    if (!sceneImage) {
      setError('Please upload a scene image');
      return;
    }

    setLoading(true);
    setError('');
    setFinalImage('');

    try {
      const response = await fetch('/api/composite-single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monumentRefImage: monumentRefImage,
          sceneImage: sceneImage
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate composite');
      }

      const data = await response.json();

      if (data.imageUrl) {
        setFinalImage(data.imageUrl);
      } else {
        throw new Error('No final image received');
      }
    } catch (err) {
      setError(err.message || 'Failed to create composite. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
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
      if (!navigator.share) {
        downloadImage(finalImage, `monument-composite-${Date.now()}.jpg`);
        alert('Sharing not supported on this browser. Image has been downloaded instead!');
        return;
      }

      const base64Response = await fetch(finalImage);
      const blob = await base64Response.blob();
      
      const file = new File([blob], `monument-${Date.now()}.jpg`, { 
        type: 'image/jpeg',
        lastModified: new Date().getTime()
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Monument Creation',
          text: 'Check out this monument composite I created!'
        });
      } else {
        await navigator.share({
          title: 'My Monument Creation',
          text: 'Check out this monument composite I created!'
        });
        downloadImage(finalImage, `monument-composite-${Date.now()}.jpg`);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      console.error('Error sharing:', err);
      downloadImage(finalImage, `monument-composite-${Date.now()}.jpg`);
      setError('Could not share image. Image has been downloaded instead!');
      setTimeout(() => setError(''), 3000);
    }
  };

  const resetAll = () => {
    setMonumentRefImage(null);
    setMonumentRefPreview('');
    setSceneImage(null);
    setScenePreview('');
    setFinalImage('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Camera className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">Monument Generator</h1>
          </div>
          <p className="text-gray-600">Upload a reference image and a scene to create your monument composite</p>
        </div>

        {/* Upload Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Monument Reference Upload */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <label className="block text-gray-800 font-semibold mb-2">
              1. Monument Reference Image
            </label>
            <p className="text-gray-600 text-sm mb-3">
              Upload an image of what you want as a monument (person, animal, object)
            </p>
            
            {!monumentRefPreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMonumentUpload}
                  className="hidden"
                  id="monument-upload"
                />
                <label htmlFor="monument-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-700 mb-1">Click to upload</p>
                  <p className="text-gray-500 text-sm">PNG, JPG, GIF up to 4MB</p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={monumentRefPreview}
                  alt="Monument reference"
                  className="w-full h-48 object-contain rounded-lg bg-gray-50 border border-gray-200"
                />
                <button
                  onClick={removeMonumentImage}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Scene Upload */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <label className="block text-gray-800 font-semibold mb-2">
              2. Scene Image
            </label>
            <p className="text-gray-600 text-sm mb-3">
              Upload where you want to place the monument (park, plaza, street)
            </p>
            
            {!scenePreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSceneUpload}
                  className="hidden"
                  id="scene-upload"
                />
                <label htmlFor="scene-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-700 mb-1">Click to upload</p>
                  <p className="text-gray-500 text-sm">PNG, JPG, GIF up to 4MB</p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={scenePreview}
                  alt="Scene"
                  className="w-full h-48 object-contain rounded-lg bg-gray-50 border border-gray-200"
                />
                <button
                  onClick={removeSceneImage}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateComposite}
          disabled={loading || !monumentRefImage || !sceneImage}
          className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mb-6"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Monument Composite...
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              Generate Monument Composite
            </>
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Result */}
        {finalImage && (
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Your Monument Composite</h2>
              <div className="flex gap-2">
                <button
                  onClick={shareImage}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button
                  onClick={() => downloadImage(finalImage, `monument-composite-${Date.now()}.jpg`)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
            <img
              src={finalImage}
              alt="Monument composite"
              className="w-full rounded-lg shadow-md border border-gray-200 mb-4"
            />
            <button
              onClick={resetAll}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-sm"
            >
              Create Another Monument
            </button>
          </div>
        )}

        {/* Tip */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>💡 Tip: Use clear, well-lit images for best results. The AI will create a monument based on your reference and place it in your scene.</p>
        </div>
      </div>
    </div>
  );
}