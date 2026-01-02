import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CreatePostPage = () => {
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [selectedClothes, setSelectedClothes] = useState([]);
  const [showClothesSelector, setShowClothesSelector] = useState(false);
  const [userClothes, setUserClothes] = useState({
    outerwear: [],
    tops: [],
    bottoms: [],
    shoes: [],
  });
  const [activeCategory, setActiveCategory] = useState('tops');
  const [uploading, setUploading] = useState(false);

  const categories = [
    { id: 'outerwear', name: '외투', icon: 'diversity_1' },
    { id: 'tops', name: '상의', icon: 'checkroom' },
    { id: 'bottoms', name: '하의', icon: 'straighten' },
    { id: 'shoes', name: '신발', icon: 'steps' },
  ];

  useEffect(() => {
    fetchUserClothes();
  }, []);

  const fetchUserClothes = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/items/by-category`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserClothes(data);
      }
    } catch (error) {
      console.error('Failed to fetch user clothes:', error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleClothingSelection = (clothing) => {
    setSelectedClothes(prev => {
      const isSelected = prev.find(c => c.id === clothing.id);
      if (isSelected) {
        return prev.filter(c => c.id !== clothing.id);
      } else {
        return [...prev, clothing];
      }
    });
  };

  const handleSubmit = async () => {
    if (!imagePreview) {
      alert('Please select an image');
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

      // Create post
      const response = await fetch(`${backendUrl}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imagePreview, // In real app, upload to S3 first
          caption,
          clothingIds: selectedClothes.map(c => c.id),
        }),
      });

      if (response.ok) {
        navigate('/feed');
      } else {
        alert('Failed to create post');
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  const currentCategoryClothes = userClothes[activeCategory] || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-rounded text-2xl text-gray-700 dark:text-gray-200">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">New Post</h1>
          <button
            onClick={handleSubmit}
            disabled={!imagePreview || uploading}
            className="px-6 py-2 bg-primary text-white rounded-full font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Posting...' : 'Share'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Image Upload */}
        {!imagePreview ? (
          <label className="flex flex-col items-center justify-center w-full aspect-square bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-primary transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <span className="material-symbols-rounded text-6xl text-gray-400 dark:text-gray-500">add_photo_alternate</span>
            <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Tap to select a photo</p>
          </label>
        ) : (
          <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-2xl overflow-hidden">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => {
                setImage(null);
                setImagePreview(null);
              }}
              className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
        )}

        {/* Caption */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Caption
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            rows={3}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Tag Clothes Button */}
        <button
          onClick={() => setShowClothesSelector(!showClothesSelector)}
          className="mt-6 w-full py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between px-4 hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-rounded text-2xl text-primary">checkroom</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              Tag Clothes {selectedClothes.length > 0 && `(${selectedClothes.length})`}
            </span>
          </div>
          <span className={`material-symbols-rounded text-gray-600 dark:text-gray-400 transition-transform ${showClothesSelector ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        {/* Selected Clothes Preview */}
        {selectedClothes.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">TAGGED ITEMS</p>
            <div className="flex gap-3 flex-wrap">
              {selectedClothes.map((clothing) => (
                <div
                  key={clothing.id}
                  className="relative group"
                >
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-white dark:bg-gray-800 border-2 border-primary shadow-md">
                    <img
                      src={clothing.image}
                      alt={clothing.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => toggleClothingSelection(clothing)}
                      className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <span className="material-symbols-rounded text-base">close</span>
                    </button>
                  </div>
                  <div className="mt-1.5 max-w-[96px]">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{clothing.category}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{clothing.subCategory}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clothes Selector */}
        {showClothesSelector && (
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg">
            {/* Category Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
                    activeCategory === category.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Clothes Grid */}
            <div className="grid grid-cols-4 gap-3">
              {currentCategoryClothes.map((clothing) => {
                const isSelected = selectedClothes.find(c => c.id === clothing.id);
                return (
                  <div
                    key={clothing.id}
                    onClick={() => toggleClothingSelection(clothing)}
                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-4 ring-primary scale-95'
                        : 'hover:scale-105'
                    }`}
                  >
                    <img
                      src={clothing.image}
                      alt={clothing.name}
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <span className="material-symbols-rounded text-white text-3xl">check_circle</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {currentCategoryClothes.length === 0 && (
              <div className="text-center py-10">
                <span className="material-symbols-rounded text-4xl text-gray-300 dark:text-gray-600">checkroom</span>
                <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">No clothes in this category</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePostPage;
