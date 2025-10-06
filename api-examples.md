# Next.js API Route Examples

## Method 1: Direct API Call (Recommended)
Use the `ImageUploadComponent.jsx` directly - it calls your Flask backend at `http://127.0.0.1:5001/ocr` with both license and user photo

## Method 2: Next.js API Route (Pages Router)
Create `pages/api/ocr.js`:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // You'll need to install a package like formidable to handle file uploads
    // npm install formidable
    const formidable = require('formidable');
    const form = new formidable.IncomingForm();
    
    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'Error parsing form data' });
      }

      const licenseFile = files.license_image;
      const userPhotoFile = files.user_photo;
      
      if (!licenseFile || !userPhotoFile) {
        return res.status(400).json({ error: 'Both license image and user photo are required' });
      }

      // Forward to Flask backend
      const formData = new FormData();
      formData.append('license_image', licenseFile);
      formData.append('user_photo', userPhotoFile);

      const response = await fetch('http://127.0.0.1:5001/ocr', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      res.status(response.status).json(data);
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

## Method 3: Next.js API Route (App Router)
Create `app/api/ocr/route.js`:

```javascript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    // Validate that both files are present
    const licenseImage = formData.get('license_image');
    const userPhoto = formData.get('user_photo');
    
    if (!licenseImage || !userPhoto) {
      return NextResponse.json(
        { error: 'Both license image and user photo are required' },
        { status: 400 }
      );
    }
    
    // Forward to Flask backend
    const response = await fetch('http://127.0.0.1:5001/ocr', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Method 4: Using Axios (Alternative)
If you prefer axios, install it first:
```bash
npm install axios
```

Then modify the upload function in `ImageUploadComponent.jsx`:

```javascript
import axios from 'axios';

const uploadImagesWithAxios = async (licenseFile, userPhotoFile) => {
  try {
    const formData = new FormData();
    formData.append('license_image', licenseFile);
    formData.append('user_photo', userPhotoFile);

    const response = await axios.post('http://127.0.0.1:5001/ocr', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error uploading images:', error);
    throw error;
  }
};
```

## Method 5: Custom Hook for Image Upload
Create a custom React hook for better reusability:

```javascript
// hooks/useImageUpload.js
import { useState } from 'react';

export const useImageUpload = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const uploadImages = async (licenseFile, userPhotoFile) => {
    if (!licenseFile || !userPhotoFile) {
      setError('Both license image and user photo are required');
      return;
    }

    setLoading(true);
    setError(null);

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
      setResult(data);
    } catch (error) {
      setError('Failed to analyze images. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  return { uploadImages, loading, error, result };
};
```

## Usage in Your Next.js App

1. **Copy the component**: Copy `ImageUploadComponent.jsx` to your `components` folder
2. **Import and use**: Import it in your page

```javascript
// pages/index.js or app/page.js
import ImageUploadComponent from '../components/ImageUploadComponent';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Driver's License Verification System
        </h1>
        <ImageUploadComponent />
      </div>
    </div>
  );
}
```

## Testing the API

### Using curl
```bash
curl -X POST \
  -F "license_image=@path/to/license.jpg" \
  -F "user_photo=@path/to/user_photo.jpg" \
  http://127.0.0.1:5001/ocr
```

### Using Postman
1. Set method to `POST`
2. Set URL to `http://127.0.0.1:5001/ocr`
3. Set body to `form-data`
4. Add two keys:
   - `license_image` (type: File)
   - `user_photo` (type: File)
5. Select your image files
6. Send request

### Expected Response
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

## Important Notes

1. **CORS**: If you get CORS errors, you'll need to add CORS headers to your Flask backend
2. **Environment Variables**: For production, use environment variables for the API URL
3. **Error Handling**: The component includes comprehensive error handling for both files
4. **Styling**: The component uses Tailwind CSS classes - make sure you have Tailwind installed
5. **File Validation**: Both license image and user photo are required for the API to work

## Adding CORS to Flask Backend

If you get CORS errors, install flask-cors:
```bash
pip install flask-cors
```

Then update your `app.py`:
```python
from flask import Flask, request, jsonify
from flask_cors import CORS
# ... other imports

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# ... rest of your code
``` 