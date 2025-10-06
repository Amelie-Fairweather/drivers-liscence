# Driver's License OCR Analyzer with Face Verification

A Flask backend that analyzes uploaded images to determine if they contain driver's license information, compares faces between license and user photos, and provides a comprehensive safety score out of 100.

## Features

- ✅ Dual image upload (license + user photo)
- ✅ Face detection and comparison
- ✅ OCR text extraction using Tesseract
- ✅ Driver's license detection
- ✅ Safety score calculation (0-100)
- ✅ Face match percentage
- ✅ CORS support for frontend integration
- ✅ Comprehensive error handling

## Backend Setup

### Prerequisites
- Python 3.9+
- Tesseract OCR engine
- CMake (for face_recognition library)

### Installation

1. **Install Tesseract** (if not already installed):
   ```bash
   # macOS
   brew install tesseract
   
   # Ubuntu/Debian
   sudo apt-get install tesseract-ocr
   
   # Windows
   # Download from https://github.com/UB-Mannheim/tesseract/wiki
   ```

2. **Install CMake** (required for face_recognition):
   ```bash
   # macOS
   brew install cmake
   
   # Ubuntu/Debian
   sudo apt-get install cmake
   ```

3. **Install Python dependencies**:
   ```bash
   pip3 install -r requirements.txt
   ```

4. **Run the server**:
   ```bash
   python3 app.py
   ```

The server will start on `http://127.0.0.1:5001`

## API Endpoints

### POST /ocr
Analyzes a license image and user photo for verification.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with:
  - `license_image`: The driver's license image file
  - `user_photo`: The user's photo file for face comparison

**Response:**
```json
{
  "text": "Extracted text from license...",
  "is_license": true,
  "face_match_score": 0.85,
  "faces_found": {
    "license_faces": 1,
    "user_faces": 1
  },
  "safety_score": 85,
  "safety_status": "very_safe",
  "confidence_level": "very_high",
  "score_breakdown": {
    "base_license_score": 30,
    "face_match_score": 34,
    "keyword_matches": 12,
    "text_quality": 6,
    "confidence_indicators": 3
  }
}
```

**Response Fields:**
- `text`: Raw text extracted from the license image
- `is_license`: Boolean indicating if the image appears to be a driver's license
- `face_match_score`: Face similarity score (0.0-1.0, higher is better)
- `faces_found`: Number of faces detected in each image
- `safety_score`: Overall safety score (0-100)
- `safety_status`: "very_safe", "safe", "moderate", "risky", or "unsafe"
- `confidence_level`: "very_high", "high", "medium", "low", or "very_low"
- `score_breakdown`: Detailed breakdown of how the safety score was calculated

## Safety Score Calculation

The safety score (0-100) is calculated based on:

1. **Base License Score** (30 points): Awarded if the image is identified as a license
2. **Face Match Score** (40 points): Based on face similarity between license and user photo
3. **Keyword Matches** (20 points): License-specific keywords found in text
4. **Text Quality** (10 points): Structured text patterns and content length
5. **Confidence Indicators** (5 points): Common license field terms

## Frontend Integration

### Method 1: Direct API Call (Recommended)

1. Copy `ImageUploadComponent.jsx` to your Next.js components folder
2. Import and use the component in your page
3. The component will directly call your Flask backend

### Method 2: Next.js API Route

See `api-examples.md` for detailed examples of:
- Pages Router API routes
- App Router API routes
- Axios integration

## Usage Examples

### Testing with curl
```bash
curl -X POST -F "license_image=@path/to/license.jpg" -F "user_photo=@path/to/user_photo.jpg" http://127.0.0.1:5001/ocr
```

### Testing with Postman
1. Set method to `POST`
2. Set URL to `http://127.0.0.1:5001/ocr`
3. Set body to `form-data`
4. Add key `license_image` with type `File`
5. Add key `user_photo` with type `File`
6. Select your image files
7. Send request

## File Structure

```
drivers liscence/
├── app.py                 # Flask backend server with face recognition
├── requirements.txt       # Python dependencies
├── ImageUploadComponent.jsx  # React component for dual image upload
├── api-examples.md       # API integration examples
├── uploads/              # Test images
│   ├── IMG_0258.jpeg
│   └── IMG_1349.jpeg
└── README.md             # This file
```

## Configuration

### Port Configuration
The server runs on port 5001 by default to avoid conflicts with macOS AirPlay service. To change the port, modify the last line in `app.py`:

```python
app.run(debug=True, port=YOUR_PORT)
```

### CORS Configuration
CORS is enabled by default to allow frontend requests. If you need to restrict origins, modify the CORS configuration in `app.py`:

```python
CORS(app, origins=['http://localhost:3000'])  # Restrict to specific origins
```

### Face Recognition Tolerance
You can adjust the face comparison sensitivity by modifying the `tolerance` parameter in the `compare_faces` function:

```python
def compare_faces(license_encodings, user_encodings, tolerance=0.6):
    # Lower tolerance = stricter matching
    # Higher tolerance = more lenient matching
```

## Troubleshooting

### Common Issues

1. **Port 5000 in use**: The server uses port 5001 by default to avoid conflicts
2. **Tesseract not found**: Make sure Tesseract is installed and in your PATH
3. **CMake not found**: Required for face_recognition library installation
4. **CORS errors**: CORS is enabled by default, but check if your frontend URL is allowed
5. **Image format errors**: Supported formats are PNG, JPG, JPEG
6. **No faces detected**: Ensure images contain clear, front-facing faces

### Debug Mode
The server runs in debug mode by default. Check the console output for detailed logs and error information.

## Development

### Adding New Features
- Modify the OCR analysis logic in the `/ocr` endpoint
- Adjust face comparison tolerance for different use cases
- Add new scoring factors to the safety calculation
- Add new endpoints as needed
- Update the frontend component to handle new response fields

### Testing
- Use the provided test images in the `uploads/` folder
- Test with different image formats and sizes
- Test face comparison with various lighting conditions
- Verify CORS functionality with your frontend

## Production Deployment

For production deployment:
1. Disable debug mode
2. Use a production WSGI server (Gunicorn, uWSGI)
3. Configure proper CORS origins
4. Set up environment variables for configuration
5. Use HTTPS for secure communication
6. Consider using a GPU for faster face recognition processing

## Privacy and Security

- Face recognition data is processed in memory and not stored
- Images are temporarily saved for processing and immediately deleted
- Consider implementing rate limiting for production use
- Ensure compliance with local privacy laws regarding biometric data

## License

This project is for educational purposes. Please ensure compliance with local laws regarding driver's license data processing and biometric verification. 