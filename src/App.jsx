import React, { useState } from 'react';
import { Camera, Loader2, Download } from 'lucide-react';

export default function MonumentGenerator() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);  // ← Changed from '' to false
  const [error, setError] = useState('');

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a monument description');
      return;
    }

    setLoading(true);
    setError('');
    setImageUrl('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
      } else {
        throw new Error('No image data received');
      }
    } catch (err) {
      setError(err.message || 'Failed to generate image. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `monument-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          
          <button
            onClick={generateImage}
            disabled={loading || !prompt.trim()}
            className="mt-4 w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
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
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {imageUrl && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-purple-400/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Your Monument</h2>
              <button
                onClick={downloadImage}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
            <img
              src={imageUrl}
              alt="Generated monument"
              className="w-full rounded-lg shadow-2xl"
            />
          </div>
        )}

        <div className="mt-8 text-center text-purple-300 text-sm">
          <p>💡 Tip: Be specific with architectural details, materials, and setting for best results</p>
        </div>
      </div>
    </div>
  );
}