from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, UnidentifiedImageError
import pytesseract
import io
import logging
import tempfile
import os
import re
import face_recognition
import numpy as np

# Set up logging for production
import sys
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=[
    "https://rider-next.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://*.vercel.app",
    "https://*.railway.app",
    "*"  # Allow all origins for now (you can restrict this later)
], 
supports_credentials=True,
allow_headers=['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
methods=['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'])  # Enable CORS for all routes

# Optional: restrict allowed file types
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_faces_from_image(image_path):
    """
    Extract face encodings from an image
    Optimized for speed with image resizing
    """
    try:
        # Load the image
        image = face_recognition.load_image_file(image_path)
        logger.debug(f"Loaded image from {image_path}, shape: {image.shape}")
        
        # Resize large images for faster face detection (face_recognition works well on smaller images)
        height, width = image.shape[:2]
        if width > 800 or height > 800:
            # Calculate resize factor to make largest dimension 800px
            scale = min(800/width, 800/height)
            new_width = int(width * scale)
            new_height = int(height * scale)
            
            # Resize using PIL for better quality
            from PIL import Image
            pil_image = Image.fromarray(image)
            pil_image = pil_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            image = np.array(pil_image)
            logger.debug(f"Resized image from {width}x{height} to {new_width}x{new_height}")
        
        # Try HOG model first (faster)
        face_locations = face_recognition.face_locations(image, model="hog")
        logger.debug(f"Found {len(face_locations)} face locations with HOG model")
        
        # If no faces found with HOG, try with more upsamples
        if not face_locations:
            face_locations = face_recognition.face_locations(image, model="hog", number_of_times_to_upsample=2)
            logger.debug(f"Found {len(face_locations)} face locations with HOG model (2x upsample)")
        
        # If still no faces, try CNN model (slower but more accurate)
        if not face_locations:
            face_locations = face_recognition.face_locations(image, model="cnn")
            logger.debug(f"Found {len(face_locations)} face locations with CNN model")
        
        if not face_locations:
            logger.debug("No faces found in image with any method")
            return []
        
        # Get face encodings
        face_encodings = face_recognition.face_encodings(image, face_locations)
        logger.debug(f"Found {len(face_encodings)} faces in image")
        
        return face_encodings
    except Exception as e:
        logger.error(f"Error extracting faces: {e}")
        return []

def compare_faces(license_encodings, user_encodings, tolerance=0.6):
    """
    Compare face encodings and return the best match score
    Enhanced with better comparison logic
    """
    if not license_encodings or not user_encodings:
        logger.debug("No face encodings to compare")
        return 0.0
    
    best_match_score = 0.0
    
    for i, license_encoding in enumerate(license_encodings):
        for j, user_encoding in enumerate(user_encodings):
            # Calculate face distance (lower is better)
            face_distance = face_recognition.face_distance([license_encoding], user_encoding)[0]
            logger.debug(f"Face distance between license face {i} and user face {j}: {face_distance}")
            
            # Convert distance to similarity score (0-1, higher is better)
            similarity_score = max(0, 1 - face_distance)
            logger.debug(f"Similarity score: {similarity_score}")
            
            # Use more lenient tolerance for real-world photos
            if face_distance <= 0.6:  # Standard tolerance
                logger.debug(f"Face match found with distance {face_distance}")
                if similarity_score > best_match_score:
                    best_match_score = similarity_score
    
    logger.debug(f"Best match score: {best_match_score}")
    return best_match_score

def calculate_safety_score(text, is_license, face_match_score=0.0):
    """
    Calculate a safety score out of 100 based on multiple factors
    Face matching is the primary security factor - good face match = high base score
    """
    score = 0
    text_lower = text.lower()
    
    # Face match is the PRIMARY factor - make it much easier to pass
    if face_match_score > 0.4:  # Any decent face match (40%+ similarity)
        # High base score for any face match
        score += 70
        face_score = int(face_match_score * 20)  # Additional points based on match quality
        score += face_score
        logger.debug(f"Face match: {face_match_score:.3f} -> base 70 + {face_score} = {score}")
    elif face_match_score > 0.2:  # Poor face match (20-40% similarity)
        # Moderate base score for poor face match
        score += 50
        face_score = int(face_match_score * 15)
        score += face_score
        logger.debug(f"Poor face match: {face_match_score:.3f} -> base 50 + {face_score} = {score}")
    else:  # No face match or very poor match (<20% similarity)
        # Low base score for no face match
        if is_license:
            score += 40  # Real license without face match
        else:
            score += 20  # Non-license without face match
        logger.debug(f"No/poor face match: {face_match_score:.3f} -> base {score}")
    
    # License-specific keywords (up to 10 points)
    license_keywords = {
        'driver': 2,
        'license': 2,
        'identification': 2,
        'state': 1,
        'dmv': 2,
        'department': 1,
        'motor': 1,
        'vehicle': 1,
        'id': 2,
        'card': 1
    }
    
    for keyword, points in license_keywords.items():
        if keyword in text_lower:
            score += points
    
    # Text quality indicators (up to 5 points)
    if re.search(r'\d{2}/\d{2}/\d{4}', text):  # Date format
        score += 2
    elif re.search(r'\d{1,2}/\d{1,2}/\d{2,4}', text):  # Any date-like pattern
        score += 1
    if re.search(r'[A-Z]{2}\s*\d{6,8}', text):  # License number pattern
        score += 2
    elif re.search(r'[A-Z]{1,3}\s*\d{4,10}', text):  # Any alphanumeric pattern
        score += 1
    if re.search(r'[A-Z]{2,3}', text):  # State abbreviations
        score += 1
    if len(text.strip()) > 20:  # Higher threshold for text content
        score += 1
    if re.search(r'[A-Z][a-z]+\s+[A-Z][a-z]+', text):  # Name pattern
        score += 1
    elif re.search(r'[A-Z][a-z]+', text):  # Any capitalized words
        score += 1
    
    # Confidence indicators (up to 5 points)
    license_fields = ['expires', 'issued', 'class', 'restrictions', 'endorsements', 'date', 'birth', 'address', 'height', 'weight', 'eyes', 'hair']
    for field in license_fields:
        if field in text_lower:
            score += 1
    
    # Face matching is already handled above as the primary factor
    
    # Cap the score at 100
    score = min(score, 100)
    
    # Ensure minimum score of 0
    score = max(score, 0)
    
    return score

def get_safety_status(score):
    """
    Convert score to safety status - Security-focused thresholds
    """
    if score >= 80:
        return "very_safe"
    elif score >= 60:
        return "safe"
    elif score >= 40:
        return "moderate"
    elif score >= 25:
        return "risky"
    elif score >= 10:
        return "unsafe"
    else:
        return "rejected"

def get_confidence_level(score):
    """
    Convert score to confidence level - Security-focused thresholds
    """
    if score >= 80:
        return "very_high"
    elif score >= 60:
        return "high"
    elif score >= 40:
        return "medium"
    elif score >= 25:
        return "low"
    elif score >= 10:
        return "very_low"
    else:
        return "minimal"

@app.route('/ocr', methods=['POST'])
def ocr():
    logger.debug("OCR endpoint called")
    
    # Check for required files
    if 'license_image' not in request.files:
        return jsonify({'error': 'No license image uploaded'}), 400
    
    if 'user_photo' not in request.files:
        return jsonify({'error': 'No user photo uploaded'}), 400

    license_file = request.files['license_image']
    user_photo_file = request.files['user_photo']

    if license_file.filename == '' or user_photo_file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(license_file.filename) or not allowed_file(user_photo_file.filename):
        return jsonify({'error': 'Unsupported file type'}), 400

    try:
        logger.debug("Processing license image...")
        # Process license image
        license_data = license_file.read()
        license_image = Image.open(io.BytesIO(license_data))
        
        if license_image.mode != 'RGB':
            license_image = license_image.convert('RGB')
        
        # Resize image for better OCR (OCR works better on appropriately sized images)
        width, height = license_image.size
        if width > 1500 or height > 1000:
            # Resize to a more OCR-friendly size while maintaining aspect ratio
            scale = min(1500/width, 1000/height)
            new_width = int(width * scale)
            new_height = int(height * scale)
            license_image = license_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            logger.debug(f"Resized license image from {width}x{height} to {new_width}x{new_height}")
        
        # Enhance image for better OCR
        from PIL import ImageEnhance
        # Moderate contrast increase
        enhancer = ImageEnhance.Contrast(license_image)
        license_image = enhancer.enhance(1.3)
        # Moderate sharpness increase
        enhancer = ImageEnhance.Sharpness(license_image)
        license_image = enhancer.enhance(1.2)
        # Slight brightness adjustment
        enhancer = ImageEnhance.Brightness(license_image)
        license_image = enhancer.enhance(1.1)
        
        # Save license image temporarily for OCR and face detection
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_license:
            license_image.save(temp_license.name, 'PNG')
            
            # Try multiple OCR configurations to get the best text extraction
            text = ""
            ocr_configs = [
                '--psm 6 --oem 3',  # Uniform block of text
                '--psm 3 --oem 3',  # Fully automatic page segmentation
                '--psm 4 --oem 3',  # Assume a single column of text
            ]
            
            for config in ocr_configs:
                try:
                    temp_text = pytesseract.image_to_string(temp_license.name, config=config)
                    if len(temp_text.strip()) > len(text.strip()):
                        text = temp_text
                        logger.debug(f"Better OCR result with config {config}: {len(text)} chars")
                except Exception as e:
                    logger.debug(f"OCR config {config} failed: {e}")
            
            logger.debug(f"OCR completed. Text length: {len(text)}")
            
            # Extract faces from license
            license_face_encodings = extract_faces_from_image(temp_license.name)
            
            # Clean up temp file
            os.unlink(temp_license.name)
        
        logger.debug("Processing user photo...")
        # Process user photo
        user_photo_data = user_photo_file.read()
        user_photo_image = Image.open(io.BytesIO(user_photo_data))
        
        if user_photo_image.mode != 'RGB':
            user_photo_image = user_photo_image.convert('RGB')
        
        # Save user photo temporarily for face detection
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_user:
            user_photo_image.save(temp_user.name, 'PNG')
            
            # Extract faces from user photo
            user_face_encodings = extract_faces_from_image(temp_user.name)
            
            # Clean up temp file
            os.unlink(temp_user.name)
        
        # Compare faces
        face_match_score = compare_faces(license_face_encodings, user_face_encodings)
        logger.debug(f"Face match score: {face_match_score:.3f}")
        
        # Analyze license text
        license_keywords = ['license', 'driver', 'id', 'identification', 'state', 'dmv', 'department']
        text_lower = text.lower()
        is_license = any(keyword in text_lower for keyword in license_keywords)
        logger.debug(f"Is license: {is_license}")
        
        # ADD DETAILED DEBUG LOGGING
        logger.debug("=== DETAILED TEXT ANALYSIS ===")
        logger.debug(f"Raw extracted text: {repr(text)}")
        logger.debug(f"Text length: {len(text)}")
        logger.debug(f"Text contains 'driver': {'driver' in text_lower}")
        logger.debug(f"Text contains 'license': {'license' in text_lower}")
        logger.debug(f"Text contains 'id': {'id' in text_lower}")
        logger.debug(f"Text contains 'state': {'state' in text_lower}")
        logger.debug(f"Text contains 'dmv': {'dmv' in text_lower}")
        logger.debug(f"Text contains 'department': {'department' in text_lower}")
        logger.debug(f"Text contains 'identification': {'identification' in text_lower}")
        
        date_pattern = bool(re.search(r'\d{1,2}/\d{1,2}/\d{2,4}', text))
        license_pattern = bool(re.search(r'[A-Z]{1,3}\s*\d{4,10}', text))
        state_pattern = bool(re.search(r'[A-Z]{2,3}', text))
        name_pattern = bool(re.search(r'[A-Z][a-z]+', text))
        
        logger.debug(f"Date patterns found: {date_pattern}")
        logger.debug(f"License number patterns found: {license_pattern}")
        logger.debug(f"State abbreviation patterns found: {state_pattern}")
        logger.debug(f"Name patterns found: {name_pattern}")
        logger.debug(f"Numbers in text: {any(char.isdigit() for char in text)}")
        logger.debug(f"Capital letters in text: {any(char.isupper() for char in text)}")
        logger.debug("========================")
        
        # Calculate safety score
        safety_score = calculate_safety_score(text, is_license, face_match_score)
        safety_status = get_safety_status(safety_score)
        confidence_level = get_confidence_level(safety_score)
        
        logger.debug(f"Safety score: {safety_score}/100")
        
        return jsonify({
            'text': text,
            'is_license': is_license,
            'face_match_score': round(face_match_score, 3),
            'faces_found': {
                'license_faces': len(license_face_encodings),
                'user_faces': len(user_face_encodings)
            },
            'safety_score': safety_score,
            'safety_status': safety_status,
            'confidence_level': confidence_level,
            'score_breakdown': {
                'base_license_score': 70 if is_license else 55,
                'face_match_score': int(face_match_score * 15),
                'keyword_matches': sum([2 if 'driver' in text_lower else 0, 2 if 'license' in text_lower else 0, 2 if 'identification' in text_lower else 0, 1 if 'state' in text_lower else 0, 2 if 'dmv' in text_lower else 0, 1 if 'department' in text_lower else 0, 1 if 'motor' in text_lower else 0, 1 if 'vehicle' in text_lower else 0, 2 if 'id' in text_lower else 0, 1 if 'card' in text_lower else 0]),
                'text_quality': sum([2 if re.search(r'\d{2}/\d{2}/\d{4}', text) else 0, 1 if re.search(r'\d{1,2}/\d{1,2}/\d{2,4}', text) else 0, 2 if re.search(r'[A-Z]{2}\s*\d{6,8}', text) else 0, 1 if re.search(r'[A-Z]{1,3}\s*\d{4,10}', text) else 0, 1 if re.search(r'[A-Z]{2,3}', text) else 0, 1 if len(text.strip()) > 5 else 0, 1 if re.search(r'[A-Z][a-z]+\s+[A-Z][a-z]+', text) else 0, 1 if re.search(r'[A-Z][a-z]+', text) else 0]),
                'confidence_indicators': sum([1 if field in text_lower else 0 for field in ['expires', 'issued', 'class', 'restrictions', 'endorsements', 'date', 'birth', 'address', 'height', 'weight', 'eyes', 'hair']])
            }
        })
        
    except UnidentifiedImageError as e:
        logger.error(f"UnidentifiedImageError: {e}")
        return jsonify({'error': 'Invalid or unsupported image format'}), 400
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Driver license verification API is running'})

@app.route('/', methods=['GET'])
def home():
    """Root endpoint"""
    return jsonify({
        'message': 'Driver License Verification API',
        'endpoints': {
            'health': '/health',
            'ocr': '/ocr'
        }
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=False, port=5001)
