import React, { useState } from 'react';

// Method 1: Using fetch with FormData (Recommended)
const uploadImagesWithFetch = async (licenseFile, userPhotoFile) => {
  try {
    const formData = new FormData();
    formData.append('license_image', licenseFile);
    formData.append('user_photo', userPhotoFile);

    const response = await fetch('http://127.0.0.1:5001/ocr', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error uploading images:', error);
    throw error;
  }
};

const getScoreColor = (score) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  if (score >= 20) return 'text-orange-600';
  return 'text-red-600';
};

const getScoreBgColor = (score) => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-yellow-500';
  if (score >= 20) return 'bg-orange-500';
  return 'bg-red-500';
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'very_safe': return '🟢';
    case 'safe': return '🟢';
    case 'moderate': return '🟡';
    case 'risky': return '🟠';
    case 'unsafe': return '🔴';
    default: return '❓';
  }
};

const getFaceMatchColor = (score) => {
  if (score >= 0.8) return 'text-green-600';
  if (score >= 0.6) return 'text-blue-600';
  if (score >= 0.4) return 'text-yellow-600';
  if (score >= 0.2) return 'text-orange-600';
  return 'text-red-600';
};

const ImageUploadComponent = () => {
  const [licenseFile, setLicenseFile] = useState(null);
  const [userPhotoFile, setUserPhotoFile] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLicenseFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setLicenseFile(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setLicensePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUserPhotoSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUserPhotoFile(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setUserPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!licenseFile || !userPhotoFile) {
      setError('Please select both a license image and a user photo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await uploadImagesWithFetch(licenseFile, userPhotoFile);
      setResult(result);
    } catch (error) {
      setError('Failed to analyze images. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Driver's License Verification</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* License Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Driver's License Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleLicenseFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          
          {/* License Preview */}
          {licensePreview && (
            <div className="mt-3">
              <img
                src={licensePreview}
                alt="License Preview"
                className="w-full h-32 object-cover rounded-lg border"
              />
            </div>
          )}
        </div>

        {/* User Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Photo
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleUserPhotoSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
          
          {/* User Photo Preview */}
          {userPhotoPreview && (
            <div className="mt-3">
              <img
                src={userPhotoPreview}
                alt="User Photo Preview"
                className="w-full h-32 object-cover rounded-lg border"
              />
            </div>
          )}
        </div>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!licenseFile || !userPhotoFile || loading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
      >
        {loading ? 'Analyzing Images...' : 'Verify License'}
      </button>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6 p-6 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-4 text-lg">Verification Results:</h3>
          
          {/* Safety Score */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Overall Safety Score:</span>
              <span className={`text-xl font-bold ${getScoreColor(result.safety_score)}`}>
                {result.safety_score}/100
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full ${getScoreBgColor(result.safety_score)} transition-all duration-500`}
                style={{ width: `${result.safety_score}%` }}
              ></div>
            </div>
          </div>

          {/* Face Match Score */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Face Match Score:</span>
              <span className={`text-lg font-bold ${getFaceMatchColor(result.face_match_score)}`}>
                {(result.face_match_score * 100).toFixed(1)}%
              </span>
            </div>
            
            {/* Face Match Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${getFaceMatchColor(result.face_match_score).replace('text-', 'bg-')} transition-all duration-500`}
                style={{ width: `${result.face_match_score * 100}%` }}
              ></div>
            </div>
            
            {/* Face Detection Info */}
            <div className="mt-2 text-xs text-gray-600">
              Faces detected: {result.faces_found.license_faces} in license, {result.faces_found.user_faces} in photo
            </div>
          </div>

          {/* Status and Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-semibold ${getScoreColor(result.safety_score)}`}>
                  {getStatusIcon(result.safety_status)} {result.safety_status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Is License:</span>
                <span className={result.is_license ? 'text-green-600' : 'text-red-600'}>
                  {result.is_license ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Confidence:</span>
                <span className="font-semibold">{result.confidence_level.replace('_', ' ').toUpperCase()}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Face Match:</span>
                <span className={result.face_match_score > 0.6 ? 'text-green-600' : 'text-red-600'}>
                  {result.face_match_score > 0.6 ? 'Match' : 'No Match'}
                </span>
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          {result.score_breakdown && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3 text-sm">Score Breakdown:</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Base License Score:</span>
                    <span>{result.score_breakdown.base_license_score} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Face Match Score:</span>
                    <span>{result.score_breakdown.face_match_score} pts</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Keyword Matches:</span>
                    <span>{result.score_breakdown.keyword_matches} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Text Quality:</span>
                    <span>{result.score_breakdown.text_quality} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence Indicators:</span>
                    <span>{result.score_breakdown.confidence_indicators} pts</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Extracted Text */}
          {result.text && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Extracted Text:</h4>
              <div className="bg-white p-3 rounded border text-sm max-h-32 overflow-y-auto">
                {result.text}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploadComponent; 