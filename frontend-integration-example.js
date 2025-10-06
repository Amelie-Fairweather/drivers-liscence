
// Example of how to modify your existing frontend code
// to lower the safety score threshold to 15% and display the score

// Your existing processVerification function - MODIFIED VERSION
const processVerification = async () => {
  // Clear previous errors
  setOcrError("");
  
  // Validate license image
  if (!licenseImage) {
    setOcrError("Please select a license image first");
    return;
  }
  
  // Validate selfie image
  if (!selfieImage) {
    setOcrError("Please select a selfie image first");
    return;
  }
  
  try {
    setVerificationLoading(true);
    
    // Create FormData for the API call
    const formData = new FormData();
    formData.append('license_image', licenseImage);
    formData.append('user_photo', selfieImage);
    
    // Call your Flask backend
    const response = await fetch('http://127.0.0.1:5001/ocr', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Display the safety score
    console.log('Safety Score:', data.safety_score);
    console.log('Face Match Score:', data.face_match_score);
    console.log('Status:', data.safety_status);
    
    // Check if safety score meets the new 15% threshold (much more realistic)
    if (data.safety_score >= 15) {
      // Verification passed
      setVerificationSuccess(true);
      setOcrError(""); // Clear any previous errors
      
      // You can store the score for display
      setSafetyScore(data.safety_score);
      setFaceMatchScore(data.face_match_score);
      
      // Optional: Show success message with score
      alert(`Verification successful! Safety Score: ${data.safety_score}/100`);
      
    } else {
      // Verification failed - show the actual score
      setVerificationSuccess(false);
      setOcrError(`Verification failed. Safety Score: ${data.safety_score}/100 (Required: 15+)`);
      
      // Store the score for display
      setSafetyScore(data.safety_score);
      setFaceMatchScore(data.face_match_score);
    }
    
  } catch (error) {
    console.error('Verification error:', error);
    setOcrError("Failed to process verification. Please try again.");
    setVerificationSuccess(false);
  } finally {
    setVerificationLoading(false);
  }
};

// Add these state variables to your component
const [safetyScore, setSafetyScore] = useState(null);
const [faceMatchScore, setFaceMatchScore] = useState(null);
const [verificationSuccess, setVerificationSuccess] = useState(false);

// Example of how to display the safety score in your JSX
const renderSafetyScore = () => {
  if (safetyScore === null) return null;
  
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
  
  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h4 className="font-semibold mb-3">Verification Results:</h4>
      
      {/* Safety Score Display */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Safety Score:</span>
          <span className={`text-lg font-bold ${getScoreColor(safetyScore)}`}>
            {safetyScore}/100
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full ${getScoreBgColor(safetyScore)} transition-all duration-500`}
            style={{ width: `${safetyScore}%` }}
          ></div>
        </div>
      </div>
      
      {/* Face Match Score */}
      {faceMatchScore !== null && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Face Match:</span>
            <span className={`text-sm font-semibold ${faceMatchScore > 0.6 ? 'text-green-600' : 'text-red-600'}`}>
              {(faceMatchScore * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
      
      {/* Status */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Status:</span>
        <span className={`text-sm font-semibold ${verificationSuccess ? 'text-green-600' : 'text-red-600'}`}>
          {verificationSuccess ? '✅ Verified' : '❌ Failed'}
        </span>
      </div>
    </div>
  );
};

// Add this to your JSX where you want to display the results
// {safetyScore !== null && renderSafetyScore()}

// Example of a complete component structure
const IdentityVerificationForm = () => {
  const [licenseImage, setLicenseImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [ocrError, setOcrError] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [safetyScore, setSafetyScore] = useState(null);
  const [faceMatchScore, setFaceMatchScore] = useState(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  
  const handleLicenseUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setLicenseImage(file);
      setOcrError(""); // Clear errors when new file is selected
    }
  };
  
  const handleSelfieUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelfieImage(file);
      setOcrError(""); // Clear errors when new file is selected
    }
  };
  
  const processVerification = async () => {
    // Clear previous errors and results
    setOcrError("");
    setSafetyScore(null);
    setFaceMatchScore(null);
    setVerificationSuccess(false);
    
    // Validate license image
    if (!licenseImage) {
      setOcrError("Please select a license image first");
      return;
    }
    
    // Validate selfie image
    if (!selfieImage) {
      setOcrError("Please select a selfie image first");
      return;
    }
    
    try {
      setVerificationLoading(true);
      
      // Create FormData for the API call
      const formData = new FormData();
      formData.append('license_image', licenseImage);
      formData.append('user_photo', selfieImage);
      
      // Call your Flask backend
      const response = await fetch('http://127.0.0.1:5001/ocr', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Store the scores
      setSafetyScore(data.safety_score);
      setFaceMatchScore(data.face_match_score);
      
      // Check if safety score meets the 15% threshold (much more realistic)
      if (data.safety_score >= 15) {
        setVerificationSuccess(true);
        setOcrError(""); // Clear any previous errors
      } else {
        setVerificationSuccess(false);
        setOcrError(`Verification failed. Safety Score: ${data.safety_score}/100 (Required: 15+)`);
      }
      
    } catch (error) {
      console.error('Verification error:', error);
      setOcrError("Failed to process verification. Please try again.");
      setVerificationSuccess(false);
    } finally {
      setVerificationLoading(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Identity Verification</h2>
      
      {/* Address Field */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address: *
        </label>
        <textarea 
          className="w-full p-3 border border-gray-300 rounded-lg resize-none"
          rows="3"
          placeholder="Enter your address..."
        />
      </div>
      
      {/* Identity Verification Box */}
      <div className="border-2 border-pink-200 rounded-lg p-4 mb-6">
        <h3 className="text-pink-600 font-semibold mb-4">Identity Verification *</h3>
        
        {/* License Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Driver's License Image: *
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleLicenseUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {licenseImage && (
            <div className="mt-2 text-green-600 text-sm">
              ✓ License uploaded: {licenseImage.name}
            </div>
          )}
        </div>
        
        {/* Selfie Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Current Selfie: *
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleSelfieUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
          {selfieImage && (
            <div className="mt-2 text-green-600 text-sm">
              ✓ Selfie uploaded: {selfieImage.name}
            </div>
          )}
        </div>
        
        {/* Verify Button */}
        <button
          onClick={processVerification}
          disabled={!licenseImage || !selfieImage || verificationLoading}
          className="w-full bg-pink-200 text-pink-800 py-2 px-4 rounded-lg hover:bg-pink-300 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
        >
          {verificationLoading ? 'Processing...' : 'Verify Identity'}
        </button>
        
        {/* Error Message */}
        {ocrError && (
          <div className="mt-3 text-red-600 text-sm">
            {ocrError}
          </div>
        )}
        
        {/* Detailed Verification Results */}
        {safetyScore !== null && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2 text-sm">Verification Results:</h4>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs">Safety Score:</span>
              <span className={`text-sm font-bold ${safetyScore >= 15 ? 'text-green-600' : 'text-red-600'}`}>
                {safetyScore}/100
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full ${safetyScore >= 15 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${safetyScore}%` }}
              ></div>
            </div>
            
            {faceMatchScore !== null && (
              <div className="flex justify-between items-center">
                <span className="text-xs">Face Match:</span>
                <span className={`text-xs font-semibold ${faceMatchScore > 0.6 ? 'text-green-600' : 'text-red-600'}`}>
                  {(faceMatchScore * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Requirement Note */}
        <div className="mt-3 text-pink-600 text-xs">
          * Both license and selfie verification with 15%+ safety score is required to complete registration
        </div>
      </div>
      
      {/* Sign Up Button */}
      <button
        disabled={!verificationSuccess}
        className="w-full bg-pink-200 text-pink-800 py-3 px-4 rounded-lg hover:bg-pink-300 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
      >
        Sign me up!
      </button>
    </div>
  );
};

export default IdentityVerificationForm; 