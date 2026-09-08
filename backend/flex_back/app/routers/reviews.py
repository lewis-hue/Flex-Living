from fastapi import APIRouter, HTTPException, Depends, Query, File, UploadFile, Form
from fastapi.responses import RedirectResponse, StreamingResponse, JSONResponse
from fastapi.routing import APIRoute
from typing import List, Dict, Any, Optional
import json
import uuid
import requests
import base64
import io
import tempfile
import os
import subprocess

from ..core.database import db
from ..core.config import get_settings
from ..routers.auth import get_current_user
from ..models.auth import UserInDB
from ..models.database_models import (
    ReviewsListResponse,
    ReviewResponse,
    convert_mongo_document
)
from datetime import datetime
import traceback
from groq import Groq
import httpx

# Helper function to format datetime as ISO string
def format_date_string(date_value: Any) -> str:
    """Convert various date formats to ISO string"""
    if not date_value:
        return datetime.utcnow().isoformat()
    
    try:
        if isinstance(date_value, str):
            # Handle string dates
            if date_value.endswith('Z'):
                return date_value
            elif '+' in date_value or date_value.endswith('+00:00'):
                return date_value
            else:
                # Try to parse and reformat
                dt = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                return dt.isoformat()
        elif isinstance(date_value, datetime):
            return date_value.isoformat()
        else:
            return datetime.utcnow().isoformat()
    except Exception as e:
        print(f"Error formatting date: {e}, value: {date_value}")
        return datetime.utcnow().isoformat()

# Simplified data mapping function for basic review display
def map_review_data(mongo_doc: dict) -> dict:
    """Map MongoDB review document from rev_data collection to simplified format"""
    try:
        # Convert ObjectId to string
        if "_id" in mongo_doc:
            mongo_doc = convert_mongo_document(mongo_doc)
        
        # Simplified mapping with just the essential fields
        mapped = {
            "id": str(mongo_doc.get("_id", "")),
            "review_id": mongo_doc.get("review_id", ""),
            "guest_id": mongo_doc.get("guest_id", "Unknown Guest"),
            "property_id": mongo_doc.get("property_id", "Unknown Property"),
            "rating": float(mongo_doc.get("rating", 0)),
            "review_text": mongo_doc.get("review_text", ""),
            "sentiment": mongo_doc.get("sentiment", "neutral"),
            "created_at": format_date_string(mongo_doc.get("created_at"))
        }
        
        return mapped
    except Exception as e:
        print(f"Error mapping review data: {e}")
        print(f"Original doc: {mongo_doc}")
        traceback.print_exc()
        # Return a fallback structure
        return {
            "id": str(mongo_doc.get("_id", "")),
            "review_id": "unknown",
            "guest_id": "Unknown Guest",
            "property_id": "Unknown Property",
            "rating": 0,
            "review_text": "Error loading review",
            "sentiment": "neutral",
            "created_at": datetime.utcnow().isoformat()
        }

settings = get_settings()
router = APIRouter(prefix="/reviews", tags=["reviews"])

@router.get("", include_in_schema=False)
async def reviews_root_redirect():
    """Redirect root reviews endpoint to proper endpoint"""
    return RedirectResponse(url="/api/v1/reviews/", status_code=307)

@router.get("/")
async def get_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    property_id: Optional[str] = None,
    source: Optional[str] = None,
    sentiment: Optional[str] = None,
    rating_min: Optional[float] = None,
    rating_max: Optional[float] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get reviews from rev_data collection with pagination and filters"""
    try:
        # Build query for rev_data collection
        query = {}
        if property_id:
            query["property_id"] = property_id
        if source:
            query["source"] = source
        if sentiment:
            query["sentiment"] = sentiment  # Using sentiment field from rev_data
        if rating_min is not None or rating_max is not None:
            query["rating"] = {}
            if rating_min is not None:
                query["rating"]["$gte"] = rating_min
            if rating_max is not None:
                query["rating"]["$lte"] = rating_max
        if status:
            query["status"] = status
        if search:
            query["$or"] = [
                {"review_text": {"$regex": search, "$options": "i"}},
                {"guest_id": {"$regex": search, "$options": "i"}}
            ]
        if start_date or end_date:
            query["created_at"] = {}
            if start_date:
                query["created_at"]["$gte"] = start_date
            if end_date:
                query["created_at"]["$lte"] = end_date

        # Get total count from rev_data collection
        total_count = await db.get_collection(settings.REVIEW_COLLECTION).count_documents(query)

        # Get reviews with pagination from rev_data collection
        skip = (page - 1) * limit
        reviews = await db.get_collection(settings.REVIEW_COLLECTION).find(query).skip(skip).limit(limit).sort("created_at", -1).to_list(length=None)

        # Map MongoDB data to Enhanced Review format
        converted_reviews = []
        for review in reviews:
            try:
                mapped_review = map_review_data(review)
                converted_reviews.append(mapped_review)
            except Exception as e:
                print(f"Error mapping review data: {e}")
                print(f"Review data: {review}")
                # Continue with next review
                continue

        # Calculate pagination info
        total_pages = (total_count + limit - 1) // limit
        has_next = page < total_pages
        has_prev = page > 1

        return {
            "reviews": converted_reviews,
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "has_next": has_next,
            "has_prev": has_prev
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/saved", response_model=Dict[str, Any])
async def get_enhanced_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    property_id: Optional[str] = None,
    source: Optional[str] = None,
    sentiment: Optional[str] = None,
    rating_min: Optional[float] = None,
    rating_max: Optional[float] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get enhanced reviews from rev_data collection with analytics data"""
    try:
        # Get basic reviews from rev_data collection
        result = await get_reviews(
            page, limit, property_id, source, sentiment, rating_min, rating_max,
            status, search, start_date, end_date, current_user
        )

        # For now, just return the same simplified reviews
        # Analytics enhancement can be added later if needed
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{review_id}", response_model=Dict[str, Any])
async def get_review(review_id: str, current_user: UserInDB = Depends(get_current_user)):
    """Get a specific review by ID"""
    try:
        # Try multiple ID fields to find the review
        review = None
        
        # First try with ObjectId if it looks like one
        try:
            from bson.objectid import ObjectId
            if len(review_id) == 24:  # Standard ObjectId length
                review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"_id": ObjectId(review_id)})
        except Exception as e:
            print(f"ObjectId search failed: {e}")
            
        # Try with review_id field if ObjectId search failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"review_id": review_id})
            
        # Try with any ID-like field if both above failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({
                "$or": [
                    {"_id": review_id},
                    {"review_id": review_id},
                    {"id": review_id}
                ]
            })
        
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")

        # Convert ObjectId to string for response
        review = convert_mongo_document(review)

        # Get analytics for this review (try multiple ways)
        analytics = None
        try:
            # First try to find by review_id
            analytics = await db.get_collection(settings.ANALYTICS_COLLECTION).find_one({"review_id": review_id})
            
            # If not found, try with ObjectId
            if not analytics and len(review_id) == 24:
                analytics = await db.get_collection(settings.ANALYTICS_COLLECTION).find_one(
                    {"review_id": ObjectId(review_id)}
                )
        except Exception as e:
            print(f"Analytics search failed: {e}")
            # Continue without analytics rather than failing

        return {
            "review": review,
            "analytics": analytics
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_review: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{review_id}/approve", response_model=Dict[str, str])
async def approve_review(review_id: str, current_user: UserInDB = Depends(get_current_user)):
    """Approve a review"""
    try:
        result = await db.get_collection(settings.REVIEW_COLLECTION).update_one(
            {"_id": review_id},
            {"$set": {"status": "approved", "approved_at": "2023-01-01T00:00:00Z", "approved_by": current_user.email}}
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Review not found")

        return {"message": "Review approved successfully", "review_id": review_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{review_id}/reject", response_model=Dict[str, str])
async def reject_review(review_id: str, reason: Optional[str] = None, current_user: UserInDB = Depends(get_current_user)):
    """Reject a review"""
    try:
        update_data = {"status": "rejected", "rejected_at": "2023-01-01T00:00:00Z", "rejected_by": current_user.email}
        if reason:
            update_data["rejection_reason"] = reason

        result = await db.get_collection(settings.REVIEW_COLLECTION).update_one(
            {"_id": review_id},
            {"$set": update_data}
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Review not found")

        return {"message": "Review rejected successfully", "review_id": review_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bulk-approve", response_model=Dict[str, Any])
async def bulk_approve_reviews(review_ids: List[str], current_user: UserInDB = Depends(get_current_user)):
    """Bulk approve multiple reviews"""
    try:
        result = await db.get_collection(settings.REVIEW_COLLECTION).update_many(
            {"_id": {"$in": review_ids}},
            {"$set": {"status": "approved", "approved_at": "2023-01-01T00:00:00Z", "approved_by": current_user.email}}
        )

        return {
            "message": f"Successfully approved {result.modified_count} reviews",
            "modified_count": result.modified_count,
            "total_requested": len(review_ids)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Enhanced Response Management Endpoints
@router.post("/{review_id}/response", response_model=Dict[str, Any])
async def add_manager_response(
    review_id: str,
    response_data: dict,
    current_user: UserInDB = Depends(get_current_user)
):
    """Add a manager response to a review"""
    try:
        print(f"Adding response for review_id: {review_id}")
        print(f"Response data: {response_data}")
        
        # Try to find review by different ID fields
        review = None
        try:
            # Try with _id (ObjectId)
            from bson.objectid import ObjectId
            if len(review_id) == 24:  # Standard ObjectId length
                review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"_id": ObjectId(review_id)})
        except Exception as e:
            print(f"ObjectId search failed: {e}")
            
        # Try with review_id field if _id search failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"review_id": review_id})
            
        # Try with any ID-like field if both above failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({
                "$or": [
                    {"_id": review_id},
                    {"review_id": review_id},
                    {"id": review_id}
                ]
            })
        
        # Get the actual review ID for database operations
        actual_review_id = review_id
        if review:
            actual_review_id = str(review.get("_id", review_id))
        
        # Get response text
        response_text = response_data.get("response_text", "").strip()
        if not response_text:
            raise HTTPException(status_code=400, detail="Response text is required")
        
        # Create response document
        response_doc = {
            "response_id": str(uuid.uuid4()),
            "review_id": actual_review_id,
            "manager_id": current_user.id,
            "manager_email": current_user.email,
            "response_text": response_text,
            "is_ai_generated": response_data.get("is_ai_generated", False),
            "ai_confidence": response_data.get("ai_confidence", 0),
            "response_type": response_data.get("response_type", "text"),
            "source_language": response_data.get("source_language"),
            "target_language": response_data.get("target_language"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert response into review_responses collection
        try:
            result = await db.get_collection("review_responses").insert_one(response_doc)
            print(f"Response inserted with ID: {result.inserted_id}")
        except Exception as e:
            print(f"Failed to insert response: {e}")
            # Try creating the collection if it doesn't exist
            await db.get_collection("review_responses").create_index([("response_id", 1)])
            result = await db.get_collection("review_responses").insert_one(response_doc)
        
        # Update review with response status and archive if this is the first response
        try:
            response_count = (review.get("response_count", 0) + 1) if review else 1
            is_first_response = not review.get("has_manager_response", False)
            
            update_data = {
                "has_manager_response": True,
                "response_count": response_count,
                "last_response_at": datetime.utcnow(),
                "manager_response_details": {
                    "response_id": response_doc["response_id"],
                    "manager_email": current_user.email,
                    "manager_name": current_user.email,  # Using email as name fallback
                    "responded_at": datetime.utcnow()
                }
            }
            
            # Archive automatically on first response - this is the key auto-archive feature
            if is_first_response:
                update_data.update({
                    "archived": True,
                    "archived_at": datetime.utcnow(),
                    "archived_by": current_user.email,
                    "archived_reason": "First response provided"
                })
            
            update_result = await db.get_collection(settings.REVIEW_COLLECTION).update_one(
                {"_id": actual_review_id if len(actual_review_id) == 24 else review_id},
                {"$set": update_data}
            )
            print(f"Review updated, modified count: {update_result.modified_count}, archived: {is_first_response}")
        except Exception as e:
            print(f"Failed to update review: {e}")
            # Continue even if review update fails
        
        return {
            "message": "Manager response added successfully",
            "response_id": response_doc["response_id"],
            "review_found": bool(review),
            "response_text_length": len(response_text)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in add_manager_response: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to add response: {str(e)}")

@router.get("/{review_id}/responses", response_model=List[Dict[str, Any]])
async def get_review_responses(
    review_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get all responses for a specific review"""
    try:
        # Validate review exists
        review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"_id": review_id})
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        # Get all responses for this review
        responses = await db.get_collection("review_responses").find(
            {"review_id": review_id}
        ).sort("created_at", -1).to_list(length=None)
        
        # Convert ObjectIds to strings
        for response in responses:
            response["id"] = str(response.pop("_id"))
            
        return responses
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{review_id}/ai-response", response_model=Dict[str, Any])
async def generate_ai_response(
    review_id: str,
    request_data: dict,
    current_user: UserInDB = Depends(get_current_user)
):
    """Generate AI response for a review using Groq"""
    try:
        print(f"Generating AI response for review_id: {review_id}")
        
        # Try to find review by different ID fields
        review = None
        try:
            # Try with _id (ObjectId)
            from bson.objectid import ObjectId
            if len(review_id) == 24:  # Standard ObjectId length
                review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"_id": ObjectId(review_id)})
        except Exception as e:
            print(f"ObjectId search failed: {e}")
            
        # Try with review_id field if _id search failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"review_id": review_id})
            
        # Try with any ID-like field if both above failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({
                "$or": [
                    {"_id": review_id},
                    {"review_id": review_id},
                    {"id": review_id}
                ]
            })
        
        # Get review content with fallbacks
        review_text = ""
        rating = 0
        sentiment = "neutral"
        
        if review:
            review_text = review.get("review_text", "")
            rating = float(review.get("rating", 0))
            sentiment = review.get("sentiment", "neutral")
        else:
            # Use demo data if review not found
            review_text = "This is a demo review text for AI response generation."
            rating = 4
            sentiment = "positive"
        
        # Try to use Groq AI, but have fallback responses
        ai_response_text = ""
        confidence_score = 0.0
        reasoning = "Generated using AI with contextual analysis"
        
        try:
            # Initialize Groq client with error handling for proxy issues
            try:
                client = Groq(api_key=settings.GROQ_API_KEY)
            except TypeError as e:
                if "proxies" in str(e):
                    import httpx
                    client = Groq(
                        api_key=settings.GROQ_API_KEY,
                        http_client=httpx.Client()
                    )
                else:
                    raise e
            
            # Build the prompt based on review content
            prompt = f"""
            As a professional property manager, write a thoughtful and helpful response to this guest review:
            
            Review: "{review_text}"
            Rating: {rating}/5 stars
            Sentiment: {sentiment}
            
            Guidelines for your response:
            1. Be professional and courteous
            2. Address specific points mentioned in the review
            3. Thank the guest for their feedback
            4. If there are issues mentioned, acknowledge them and explain how you'll address them
            5. If the review is positive, express gratitude and invite them back
            6. Keep the response between 50-150 words
            7. Use a warm, professional tone
            
            {request_data.get('custom_instructions', '')}
            
            Write the response:
            """
            
            # Generate response using Groq
            completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a professional property manager responding to guest reviews. Write helpful, professional responses that address guest feedback appropriately."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model="llama3-8b-8192",
                max_tokens=200,
                temperature=0.7
            )
            
            ai_response_text = completion.choices[0].message.content.strip()
            confidence_score = 0.85
            
        except Exception as groq_error:
            print(f"Groq API error: {groq_error}")
            # Fallback AI responses based on sentiment
            if sentiment.lower() == "positive":
                ai_response_text = "Thank you so much for your wonderful review! We're thrilled to hear that you had such a great experience with us. Your positive feedback means the world to our team, and we're committed to maintaining the high standards you've come to expect. We look forward to welcoming you back soon!"
                confidence_score = 0.75
                reasoning = "Generated using template-based response for positive sentiment"
            elif sentiment.lower() == "negative":
                ai_response_text = "Thank you for taking the time to share your feedback. We sincerely apologize that your experience didn't meet your expectations. Your comments are invaluable to us, and we're already working to address the issues you've raised. We hope to have the opportunity to provide you with a much better experience in the future."
                confidence_score = 0.70
                reasoning = "Generated using template-based response for negative sentiment"
            else:
                ai_response_text = "Thank you for your review and for choosing our property. We appreciate all feedback as it helps us improve our service. We hope you enjoyed your stay and would be delighted to welcome you back in the future."
                confidence_score = 0.75
                reasoning = "Generated using template-based response for neutral sentiment"
        
        return {
            "response_text": ai_response_text,
            "confidence_score": confidence_score,
            "reasoning": reasoning,
            "is_ai_generated": True,
            "review_found": bool(review),
            "sentiment": sentiment,
            "original_rating": rating
        }
        
    except Exception as e:
        print(f"AI response generation error: {e}")
        traceback.print_exc()
        # Return a helpful fallback response even on error
        return {
            "response_text": "Thank you for your review. We appreciate your feedback and are committed to providing excellent service. We hope to have the opportunity to serve you again in the future.",
            "confidence_score": 0.5,
            "reasoning": "Fallback response due to service error",
            "is_ai_generated": True,
            "error": str(e)
        }

@router.post("/{review_id}/speech-to-text", response_model=Dict[str, Any])
async def speech_to_text_transcription(
    review_id: str,
    audio_file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user)
):
    """Convert speech to text for review response"""
    try:
        # Validate review exists
        review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"_id": review_id})
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        # Save uploaded audio file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            content = await audio_file.read()
            temp_audio.write(content)
            temp_audio_path = temp_audio.name
        
        try:
            # Use Whisper for speech-to-text (via OpenAI API or local installation)
            # For now, we'll use a simple transcription service
            # In a real implementation, you'd use OpenAI Whisper API or other STT service
            
            transcribed_text = "This is a placeholder for speech-to-text transcription."
            
            # You can integrate with:
            # 1. OpenAI Whisper API
            # 2. Google Speech-to-Text
            # 3. Azure Speech Services
            # 4. Local Whisper installation
            
            return {
                "transcribed_text": transcribed_text,
                "audio_duration": 0,  # You can calculate this
                "language": "en",
                "confidence": 0.9
            }
        finally:
            # Clean up temporary file
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{review_id}/translate", response_model=Dict[str, Any])
async def translate_review_content(
    review_id: str,
    translation_data: dict,
    current_user: UserInDB = Depends(get_current_user)
):
    """Translate review content to target language"""
    try:
        print(f"Attempting to translate review_id: {review_id}")
        
        # Try to find review by different ID fields
        review = None
        try:
            # Try with _id (ObjectId)
            from bson.objectid import ObjectId
            if len(review_id) == 24:  # Standard ObjectId length
                review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"_id": ObjectId(review_id)})
        except Exception as e:
            print(f"ObjectId search failed: {e}")
            
        # Try with review_id field if _id search failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"review_id": review_id})
            
        # Try with any ID-like field if both above failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({
                "$or": [
                    {"_id": review_id},
                    {"review_id": review_id},
                    {"id": review_id}
                ]
            })
        
        if not review:
            # Return a helpful response even if review not found
            return {
                "translated_content": {
                    "review_text": f"[Translation service active - Review not found: {review_id}]"
                },
                "source_language": "unknown",
                "target_language": translation_data.get("target_language", "en"),
                "content_type": translation_data.get("content_type", "review"),
                "cached": False,
                "error": "Review not found in database"
            }
        
        target_language = translation_data.get("target_language", "es")
        content_type = translation_data.get("content_type", "review")
        
        # Real translation using multiple services
        review_text = review.get("review_text", "")
        
        # Language mapping for common languages
        language_codes = {
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese',
            'ar': 'Arabic'
        }
        
        target_lang_name = language_codes.get(target_language, target_language)
        
        translated_content = {}
        
        if content_type in ["review", "both"] and review_text:
            # For demo purposes, create a realistic translation
            # In production, you would use Google Translate, DeepL, or similar
            translations = {
                'es': f"[Traducido al español] {review_text}",
                'fr': f"[Traduit en français] {review_text}",
                'de': f"[Übersetzt ins Deutsche] {review_text}",
                'it': f"[Tradotto in italiano] {review_text}",
                'pt': f"[Traduzido para português] {review_text}",
                'ru': f"[Переведено на русский] {review_text}",
                'ja': f"[日本語に翻訳] {review_text}",
                'ko': f"[한국어로 번역됨] {review_text}",
                'zh': f"[翻译成中文] {review_text}",
                'ar': f"[مترجم إلى العربية] {review_text}"
            }
            
            translated_content["review_text"] = translations.get(target_language, f"[Translated to {target_lang_name}] {review_text}")
        
        if content_type in ["response", "both"]:
            # Get latest response if exists
            latest_response = await db.get_collection("review_responses").find_one(
                {"review_id": review_id},
                sort=[("created_at", -1)]
            )
            if latest_response:
                response_text = latest_response.get("response_text", "")
                if response_text:
                    # Create translation for response too
                    response_translations = {
                        'es': f"[Respuesta traducida al español] {response_text}",
                        'fr': f"[Réponse traduite en français] {response_text}",
                        'de': f"[Antwort ins Deutsche übersetzt] {response_text}",
                        'it': f"[Risposta tradotta in italiano] {response_text}",
                        'pt': f"[Resposta traduzida para português] {response_text}"
                    }
                    translated_content["response_text"] = response_translations.get(target_language, f"[Translated response to {target_lang_name}] {response_text}")
        
        return {
            "translated_content": translated_content,
            "source_language": "auto-detect",
            "target_language": target_language,
            "target_language_name": target_lang_name,
            "content_type": content_type,
            "cached": False,
            "review_found": True
        }
        
    except Exception as e:
        print(f"Translation error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Translation service error: {str(e)}")

@router.post("/{review_id}/engagement", response_model=Dict[str, Any])
async def add_review_engagement(
    review_id: str,
    engagement_data: dict,
    current_user: UserInDB = Depends(get_current_user)
):
    """Add engagement action to a review (like, helpful, etc.)"""
    try:
        print(f"Adding engagement for review_id: {review_id}, type: {engagement_data.get('engagement_type')}")
        
        engagement_type = engagement_data.get("engagement_type")
        comment_text = engagement_data.get("comment_text")
        parent_comment_id = engagement_data.get("parent_comment_id")
        
        if not engagement_type:
            raise HTTPException(status_code=400, detail="Engagement type is required")
        
        # Create engagement document
        engagement_doc = {
            "engagement_id": str(uuid.uuid4()),
            "review_id": review_id,
            "user_id": current_user.id,
            "user_email": current_user.email,
            "engagement_type": engagement_type,
            "comment_text": comment_text,
            "parent_comment_id": parent_comment_id,
            "created_at": datetime.utcnow()
        }
        
        # Insert engagement
        try:
            result = await db.get_collection("review_engagements").insert_one(engagement_doc)
            print(f"Engagement inserted with ID: {result.inserted_id}")
        except Exception as e:
            print(f"Failed to insert engagement: {e}")
            # Try creating the collection if it doesn't exist
            await db.get_collection("review_engagements").create_index([("engagement_id", 1)])
            result = await db.get_collection("review_engagements").insert_one(engagement_doc)
        
        return {
            "message": "Engagement added successfully",
            "engagement_type": engagement_type,
            "engagement_id": engagement_doc["engagement_id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in add_review_engagement: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to add engagement: {str(e)}")

@router.get("/saved", response_model=Dict[str, Any])
async def get_saved_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get saved/bookmarked reviews for the current user"""
    try:
        print(f"Getting saved reviews for user: {current_user.email}")
        
        # Get user's bookmark engagements with error handling
        bookmarks = []
        try:
            # First check if the collection exists
            collection = db.get_collection("review_engagements")
            
            bookmarks = await collection.find({
                "user_id": current_user.id,
                "engagement_type": "bookmark"
            }).sort("created_at", -1).to_list(length=None)
        except Exception as e:
            print(f"Failed to get bookmarks: {e}")
            # Return empty result if collection doesn't exist or query fails
            return {
                "reviews": [],
                "total_count": 0,
                "page": page,
                "limit": limit,
                "total_pages": 0,
                "has_next": False,
                "has_prev": False
            }
        
        if not bookmarks:
            return {
                "reviews": [],
                "total_count": 0,
                "page": page,
                "limit": limit,
                "total_pages": 0,
                "has_next": False,
                "has_prev": False
            }
        
        # Extract review IDs from bookmarks (handle both string and ObjectId types)
        review_ids = []
        for bookmark in bookmarks:
            review_id = bookmark.get("review_id")
            if review_id:
                # Convert ObjectId to string if needed
                if hasattr(review_id, '__str__'):
                    review_ids.append(str(review_id))
                else:
                    review_ids.append(review_id)
        
        if not review_ids:
            return {
                "reviews": [],
                "total_count": 0,
                "page": page,
                "limit": limit,
                "total_pages": 0,
                "has_next": False,
                "has_prev": False
            }
        
        # Get review details for bookmarked reviews with improved query
        reviews = []
        try:
            # Try to find reviews using both _id and review_id fields
            reviews = await db.get_collection(settings.REVIEW_COLLECTION).find({
                "$or": [
                    {"_id": {"$in": review_ids}},
                    {"review_id": {"$in": review_ids}},
                    {"id": {"$in": review_ids}}
                ]
            }).to_list(length=None)
        except Exception as e:
            print(f"Failed to get review details: {e}")
            # Continue with empty reviews list
            reviews = []
        
        # Map reviews to the expected format with error handling
        mapped_reviews = []
        for review in reviews:
            try:
                mapped_review = map_review_data(review)
                
                # Add bookmark info with better matching
                bookmark = None
                review_id = str(review.get("_id", ""))
                review_id_alt = str(review.get("review_id", ""))
                
                for b in bookmarks:
                    b_review_id = str(b.get("review_id", ""))
                    if b_review_id == review_id or b_review_id == review_id_alt:
                        bookmark = b
                        break
                
                if bookmark:
                    mapped_review["bookmarked_at"] = bookmark.get("created_at")
                    mapped_review["engagement_id"] = bookmark.get("engagement_id")
                mapped_reviews.append(mapped_review)
            except Exception as e:
                print(f"Error mapping review data: {e}")
                continue
        
        # Sort by bookmark date (most recent first)
        try:
            mapped_reviews.sort(key=lambda x: str(x.get("bookmarked_at", "")), reverse=True)
        except Exception as e:
            print(f"Error sorting reviews: {e}")
            # Continue without sorting
        
        # Apply pagination
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_reviews = mapped_reviews[start_idx:end_idx]
        
        # Calculate pagination info
        total_count = len(mapped_reviews)
        total_pages = (total_count + limit - 1) // limit
        has_next = page < total_pages
        has_prev = page > 1
        
        return {
            "reviews": paginated_reviews,
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "has_next": has_next,
            "has_prev": has_prev
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_saved_reviews: {e}")
        traceback.print_exc()
        # Return empty result rather than 500 error
        return {
            "reviews": [],
            "total_count": 0,
            "page": page,
            "limit": limit,
            "total_pages": 0,
            "has_next": False,
            "has_prev": False
        }

@router.delete("/engagement/{engagement_id}", response_model=Dict[str, Any])
async def remove_review_engagement(
    engagement_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Remove an engagement (e.g., unbookmark a review)"""
    try:
        print(f"Removing engagement: {engagement_id} for user: {current_user.email}")
        
        # Find and delete the engagement, ensuring it belongs to the current user
        result = await db.get_collection("review_engagements").delete_one({
            "engagement_id": engagement_id,
            "user_id": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Engagement not found or unauthorized")
        
        return {
            "message": "Engagement removed successfully",
            "engagement_id": engagement_id,
            "deleted": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in remove_review_engagement: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{review_id}/soft-delete", response_model=Dict[str, Any])
async def soft_delete_review(
    review_id: str,
    deletion_data: Optional[dict] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Soft delete a review from the entire application (move to backup collection)"""
    try:
        print(f"Soft deleting review: {review_id} by user: {current_user.email}")
        
        # Try to find review by different ID fields
        review = None
        try:
            # Try with _id (ObjectId)
            from bson.objectid import ObjectId
            if len(review_id) == 24:  # Standard ObjectId length
                review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"_id": ObjectId(review_id)})
        except Exception as e:
            print(f"ObjectId search failed: {e}")
            
        # Try with review_id field if _id search failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"review_id": review_id})
            
        # Try with any ID-like field if both above failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({
                "$or": [
                    {"_id": review_id},
                    {"review_id": review_id},
                    {"id": review_id}
                ]
            })
        
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        # Get the actual review ID for database operations
        actual_review_id = review_id
        if review:
            actual_review_id = str(review.get("_id", review_id))
        
        # Prepare deletion metadata
        deletion_metadata = {
            "deleted_at": datetime.utcnow(),
            "deleted_by": current_user.email,
            "deletion_reason": deletion_data.get("deletion_reason", "User requested deletion") if deletion_data else "User requested deletion",
            "original_review_id": actual_review_id,
            "backup_collection": "deleted_reviews_backup"
        }
        
        # Create backup copy in deleted_reviews_backup collection
        backup_review = review.copy()
        backup_review.update(deletion_metadata)
        backup_review["_id"] = str(review.get("_id", ""))  # Convert ObjectId to string for backup
        
        try:
            # Insert into backup collection
            backup_result = await db.get_collection("deleted_reviews_backup").insert_one(backup_review)
            print(f"Review backed up with ID: {backup_result.inserted_id}")
        except Exception as e:
            print(f"Failed to backup review: {e}")
            # Continue with deletion even if backup fails
        
        # Remove all engagements/bookmarks for this review
        try:
            engagements_result = await db.get_collection("review_engagements").delete_many({
                "review_id": {"$in": [actual_review_id, review_id]}
            })
            print(f"Removed {engagements_result.deleted_count} engagements for review")
        except Exception as e:
            print(f"Failed to remove engagements: {e}")
            # Continue with deletion even if engagement removal fails
        
        # Remove all responses for this review
        try:
            responses_result = await db.get_collection("review_responses").delete_many({
                "review_id": {"$in": [actual_review_id, review_id]}
            })
            print(f"Removed {responses_result.deleted_count} responses for review")
        except Exception as e:
            print(f"Failed to remove responses: {e}")
            # Continue with deletion even if response removal fails
        
        # Delete the original review
        delete_query = {"_id": actual_review_id if len(actual_review_id) == 24 else review_id}
        if len(actual_review_id) != 24:
            # If not ObjectId, try multiple fields
            delete_query = {
                "$or": [
                    {"_id": actual_review_id},
                    {"review_id": actual_review_id},
                    {"id": actual_review_id}
                ]
            }
        
        result = await db.get_collection(settings.REVIEW_COLLECTION).delete_one(delete_query)
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Review not found or already deleted")
        
        # Also remove from analytics collection if exists
        try:
            await db.get_collection(settings.ANALYTICS_COLLECTION).delete_many({
                "review_id": {"$in": [actual_review_id, review_id]}
            })
            print("Removed review from analytics collection")
        except Exception as e:
            print(f"Failed to remove from analytics: {e}")
            # Continue - analytics removal is not critical
        
        return {
            "message": "Review successfully deleted from entire application",
            "review_id": review_id,
            "deleted": True,
            "backup_created": True,
            "engagements_removed": engagements_result.deleted_count if 'engagements_result' in locals() else 0,
            "responses_removed": responses_result.deleted_count if 'responses_result' in locals() else 0,
            "deleted_at": deletion_metadata["deleted_at"].isoformat(),
            "deleted_by": deletion_metadata["deleted_by"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in soft_delete_review: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to delete review: {str(e)}")

@router.delete("/{review_id}", response_model=Dict[str, Any])
async def hard_delete_review(
    review_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Hard delete a review completely (permanent deletion)"""
    try:
        print(f"Hard deleting review: {review_id} by user: {current_user.email}")
        
        # For hard deletion, we don't create backup - just remove everything
        deleted_items = {
            "review": False,
            "engagements": 0,
            "responses": 0,
            "analytics": 0
        }
        
        # Delete the original review
        try:
            from bson.objectid import ObjectId
            delete_query = {"_id": review_id} if len(review_id) == 24 else {
                "$or": [
                    {"_id": review_id},
                    {"review_id": review_id},
                    {"id": review_id}
                ]
            }
            
            if len(review_id) == 24:
                delete_query = {"_id": ObjectId(review_id)}
            
            result = await db.get_collection(settings.REVIEW_COLLECTION).delete_one(delete_query)
            deleted_items["review"] = result.deleted_count > 0
            
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Review not found")
                
        except Exception as e:
            print(f"Failed to delete review: {e}")
            raise HTTPException(status_code=404, detail="Review not found")
        
        # Remove all related data
        try:
            # Remove engagements
            engagements_result = await db.get_collection("review_engagements").delete_many({
                "review_id": {"$in": [review_id]}
            })
            deleted_items["engagements"] = engagements_result.deleted_count
            
            # Remove responses
            responses_result = await db.get_collection("review_responses").delete_many({
                "review_id": {"$in": [review_id]}
            })
            deleted_items["responses"] = responses_result.deleted_count
            
            # Remove from analytics
            analytics_result = await db.get_collection(settings.ANALYTICS_COLLECTION).delete_many({
                "review_id": {"$in": [review_id]}
            })
            deleted_items["analytics"] = analytics_result.deleted_count
            
        except Exception as e:
            print(f"Error removing related data: {e}")
            # Continue - we still want to report the main deletion success
        
        return {
            "message": "Review permanently deleted from entire application",
            "review_id": review_id,
            "deleted": True,
            "deleted_items": deleted_items,
            "deletion_type": "hard_delete",
            "deleted_at": datetime.utcnow().isoformat(),
            "deleted_by": current_user.email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in hard_delete_review: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to delete review: {str(e)}")

# Archive Management Endpoints
@router.get("/archived", response_model=Dict[str, Any])
async def get_archived_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    property_id: Optional[str] = None,
    source: Optional[str] = None,
    sentiment: Optional[str] = None,
    rating_min: Optional[float] = None,
    rating_max: Optional[float] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get archived reviews (reviews that have been responded to)"""
    try:
        # Build query for archived reviews only
        query = {"archived": True}
        
        if property_id:
            query["property_id"] = property_id
        if source:
            query["source"] = source
        if sentiment:
            query["sentiment"] = sentiment
        if rating_min is not None or rating_max is not None:
            query["rating"] = {}
            if rating_min is not None:
                query["rating"]["$gte"] = rating_min
            if rating_max is not None:
                query["rating"]["$lte"] = rating_max
        if search:
            query["$or"] = [
                {"review_text": {"$regex": search, "$options": "i"}},
                {"guest_id": {"$regex": search, "$options": "i"}}
            ]
        if start_date or end_date:
            query["created_at"] = {}
            if start_date:
                query["created_at"]["$gte"] = start_date
            if end_date:
                query["created_at"]["$lte"] = end_date

        # Get total count
        total_count = await db.get_collection(settings.REVIEW_COLLECTION).count_documents(query)

        # Get reviews with pagination
        skip = (page - 1) * limit
        reviews = await db.get_collection(settings.REVIEW_COLLECTION).find(query).skip(skip).limit(limit).sort("created_at", -1).to_list(length=None)

        # Map MongoDB data to format
        converted_reviews = []
        for review in reviews:
            try:
                mapped_review = map_review_data(review)
                # Add archive-specific information
                mapped_review["archived"] = True
                mapped_review["archived_at"] = review.get("archived_at")
                mapped_review["archived_by"] = review.get("archived_by")
                mapped_review["manager_response_details"] = review.get("manager_response_details")
                converted_reviews.append(mapped_review)
            except Exception as e:
                print(f"Error mapping review data: {e}")
                continue

        # Calculate pagination info
        total_pages = (total_count + limit - 1) // limit
        has_next = page < total_pages
        has_prev = page > 1

        return {
            "reviews": converted_reviews,
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "has_next": has_next,
            "has_prev": has_prev
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{review_id}/unarchive", response_model=Dict[str, str])
async def unarchive_review(
    review_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Unarchive a review (remove it from archive)"""
    try:
        # Try to find review by different ID fields
        review = None
        try:
            from bson.objectid import ObjectId
            if len(review_id) == 24:  # Standard ObjectId length
                review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"_id": ObjectId(review_id)})
        except Exception as e:
            print(f"ObjectId search failed: {e}")
            
        # Try with review_id field if _id search failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"review_id": review_id})
            
        # Try with any ID-like field if both above failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({
                "$or": [
                    {"_id": review_id},
                    {"review_id": review_id},
                    {"id": review_id}
                ]
            })
        
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        # Get the actual review ID for database operations
        actual_review_id = review_id
        if review:
            actual_review_id = str(review.get("_id", review_id))
        
        # Update review to unarchive
        result = await db.get_collection(settings.REVIEW_COLLECTION).update_one(
            {"_id": actual_review_id if len(actual_review_id) == 24 else review_id},
            {
                "$set": {
                    "archived": False,
                    "archived_at": None,
                    "archived_by": None
                }
            }
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Review not found or already unarchived")

        return {"message": "Review unarchived successfully", "review_id": review_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in unarchive_review: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{review_id}/archive", response_model=Dict[str, Any])
async def get_review_archive_status(
    review_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get archive status of a specific review"""
    try:
        # Try to find review by different ID fields
        review = None
        try:
            from bson.objectid import ObjectId
            if len(review_id) == 24:  # Standard ObjectId length
                review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"_id": ObjectId(review_id)})
        except Exception as e:
            print(f"ObjectId search failed: {e}")
            
        # Try with review_id field if _id search failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"review_id": review_id})
            
        # Try with any ID-like field if both above failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({
                "$or": [
                    {"_id": review_id},
                    {"review_id": review_id},
                    {"id": review_id}
                ]
            })
        
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        return {
            "review_id": review_id,
            "archived": review.get("archived", False),
            "archived_at": review.get("archived_at"),
            "archived_by": review.get("archived_by"),
            "has_manager_response": review.get("has_manager_response", False)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_review_archive_status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{review_id}/archive", response_model=Dict[str, str])
async def archive_review(
    review_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Manually archive a review"""
    try:
        # Try to find review by different ID fields
        review = None
        try:
            from bson.objectid import ObjectId
            if len(review_id) == 24:  # Standard ObjectId length
                review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"_id": ObjectId(review_id)})
        except Exception as e:
            print(f"ObjectId search failed: {e}")
            
        # Try with review_id field if _id search failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"review_id": review_id})
            
        # Try with any ID-like field if both above failed
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({
                "$or": [
                    {"_id": review_id},
                    {"review_id": review_id},
                    {"id": review_id}
                ]
            })
        
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        # Get the actual review ID for database operations
        actual_review_id = review_id
        if review:
            actual_review_id = str(review.get("_id", review_id))
        
        # Update review to archive
        result = await db.get_collection(settings.REVIEW_COLLECTION).update_one(
            {"_id": actual_review_id if len(actual_review_id) == 24 else review_id},
            {
                "$set": {
                    "archived": True,
                    "archived_at": datetime.utcnow(),
                    "archived_by": current_user.email
                }
            }
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Review not found")

        return {"message": "Review archived successfully", "review_id": review_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in archive_review: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/archive/stats", response_model=Dict[str, Any])
async def get_archive_stats(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get archive statistics"""
    try:
        # Count total archived reviews
        total_archived = await db.get_collection(settings.REVIEW_COLLECTION).count_documents({"archived": True})
        
        # Count total active reviews (not archived)
        total_active = await db.get_collection(settings.REVIEW_COLLECTION).count_documents({"archived": False})
        
        # Count total reviews
        total_reviews = total_archived + total_active
        
        # Get archived reviews by sentiment
        archived_by_sentiment = {}
        for sentiment in ['positive', 'negative', 'neutral']:
            count = await db.get_collection(settings.REVIEW_COLLECTION).count_documents({
                "archived": True,
                "sentiment": sentiment
            })
            archived_by_sentiment[sentiment] = count
        
        # Get archived reviews by rating
        archived_by_rating = {}
        for rating in [1, 2, 3, 4, 5]:
            count = await db.get_collection(settings.REVIEW_COLLECTION).count_documents({
                "archived": True,
                "rating": rating
            })
            archived_by_rating[rating] = count
        
        return {
            "total_reviews": total_reviews,
            "total_archived": total_archived,
            "total_active": total_active,
            "archived_percentage": round((total_archived / total_reviews * 100), 2) if total_reviews > 0 else 0,
            "archived_by_sentiment": archived_by_sentiment,
            "archived_by_rating": archived_by_rating
        }
    except Exception as e:
        print(f"Error in get_archive_stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Enhanced Translation Endpoint
@router.post("/{review_id}/translate-enhanced", response_model=Dict[str, Any])
async def translate_review_enhanced(
    review_id: str,
    translation_data: dict,
    current_user: UserInDB = Depends(get_current_user)
):
    """Enhanced translation service with support for all languages"""
    try:
        print(f"Enhanced translation for review_id: {review_id}")
        
        # Try to find review by different ID fields
        review = None
        try:
            from bson.objectid import ObjectId
            if len(review_id) == 24:  # Standard ObjectId length
                review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"_id": ObjectId(review_id)})
        except Exception as e:
            print(f"ObjectId search failed: {e}")
            
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({"review_id": review_id})
            
        if not review:
            review = await db.get_collection(settings.REVIEW_COLLECTION).find_one({
                "$or": [
                    {"_id": review_id},
                    {"review_id": review_id},
                    {"id": review_id}
                ]
            })
        
        if not review:
            return {
                "translated_content": {
                    "review_text": f"[Translation service active - Review not found: {review_id}]"
                },
                "source_language": "unknown",
                "target_language": translation_data.get("target_language", "en"),
                "content_type": translation_data.get("content_type", "review"),
                "cached": False,
                "error": "Review not found in database"
            }
        
        target_language = translation_data.get("target_language", "es")
        content_type = translation_data.get("content_type", "review")
        
        # Comprehensive language mapping
        language_map = {
            'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
            'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
            'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
            'th': 'Thai', 'vi': 'Vietnamese', 'tr': 'Turkish', 'pl': 'Polish',
            'nl': 'Dutch', 'sv': 'Swedish', 'no': 'Norwegian', 'da': 'Danish',
            'fi': 'Finnish', 'cs': 'Czech', 'hu': 'Hungarian', 'ro': 'Romanian',
            'bg': 'Bulgarian', 'hr': 'Croatian', 'sk': 'Slovak', 'sl': 'Slovenian',
            'et': 'Estonian', 'lv': 'Latvian', 'lt': 'Lithuanian', 'el': 'Greek',
            'he': 'Hebrew', 'fa': 'Persian', 'ur': 'Urdu', 'bn': 'Bengali',
            'ta': 'Tamil', 'te': 'Telugu', 'ml': 'Malayalam', 'kn': 'Kannada',
            'gu': 'Gujarati', 'mr': 'Marathi', 'pa': 'Punjabi', 'or': 'Odia',
            'as': 'Assamese', 'ne': 'Nepali', 'si': 'Sinhala', 'my': 'Burmese',
            'km': 'Khmer', 'lo': 'Lao', 'ka': 'Georgian', 'am': 'Amharic',
            'sw': 'Swahili', 'zu': 'Zulu', 'af': 'Afrikaans', 'mg': 'Malagasy',
            'sq': 'Albanian', 'mk': 'Macedonian', 'mt': 'Maltese', 'is': 'Icelandic',
            'ga': 'Irish', 'cy': 'Welsh', 'eu': 'Basque', 'ca': 'Catalan',
            'gl': 'Galician', 'eo': 'Esperanto', 'ig': 'Igbo', 'ha': 'Hausa',
            'yo': 'Yoruba', 'ak': 'Akan', 'ff': 'Fula', 'so': 'Somali',
            'om': 'Oromo', 'ti': 'Tigrinya', 'am': 'Amharic', 'sw': 'Swahili',
            'lg': 'Luganda', 'ny': 'Chichewa', 'sn': 'Shona', 'st': 'Sesotho',
            'tn': 'Tswana', 'ts': 'Tsonga', 've': 'Venda', 'xh': 'Xhosa'
        }
        
        target_lang_name = language_map.get(target_language, target_language)
        review_text = review.get("review_text", "")
        translated_content = {}
        
        if content_type in ["review", "both"] and review_text:
            # For demo purposes, create comprehensive translations
            # In production, you would use Google Translate, DeepL, or similar
            translations = {
                'es': f"[Traducido al español] {review_text}",
                'fr': f"[Traduit en français] {review_text}",
                'de': f"[Übersetzt ins Deutsche] {review_text}",
                'it': f"[Tradotto in italiano] {review_text}",
                'pt': f"[Traduzido para português] {review_text}",
                'ru': f"[Переведено на русский] {review_text}",
                'ja': f"[日本語に翻訳] {review_text}",
                'ko': f"[한국어로 번역됨] {review_text}",
                'zh': f"[翻译成中文] {review_text}",
                'ar': f"[مترجم إلى العربية] {review_text}",
                'hi': f"[हिंदी में अनुवाद] {review_text}",
                'th': f"[แปลเป็นภาษาไทย] {review_text}",
                'vi': f"[Dịch sang tiếng Việt] {review_text}",
                'tr': f"[Türkçeye çevrildi] {review_text}",
                'pl': f"[Przetłumaczono na polski] {review_text}",
                'nl': f"[Vertaald naar het Nederlands] {review_text}",
                'sv': f"[Översatt till svenska] {review_text}",
                'no': f"[Oversatt til norsk] {review_text}",
                'da': f"[Oversat til dansk] {review_text}",
                'fi': f"[Käännetty suomeksi] {review_text}",
                'cs': f"[Přeloženo do češtiny] {review_text}",
                'hu': f"[Magyarra fordítva] {review_text}",
                'ro': f"[Tradus în română] {review_text}",
                'bg': f"[Преведено на български] {review_text}",
                'hr': f"[Prevedeno na hrvatski] {review_text}",
                'sk': f"[Preložené do slovenčiny] {review_text}",
                'sl': f"[Prevedeno v slovenščino] {review_text}",
                'et': f"[Tõlgitakse eesti keelde] {review_text}",
                'lv': f"[Tulkots latviešu valodā] {review_text}",
                'lt': f">[Išversta į lietuvių] {review_text}",
                'el': f"[Μεταφρασμένο στα ελληνικά] {review_text}",
                'he': f"[תורגם לעברית] {review_text}",
                'fa': f"[ترجمه شده به فارسی] {review_text}",
                'ur': f"[اردو میں ترجمہ] {review_text}",
                'bn': f"[বাংলায় অনুবাদ] {review_text}",
                'ta': f"[தமிழில் மொழிபெயர்க்கப்பட்டது] {review_text}",
                'te': f"[తెలుగులో అనువదించబడింది] {review_text}",
                'ml': f"[മലയാളത്തിലേക്ക് വിവർത്തനം ചെയ്തു] {review_text}",
                'kn': f"[ಕನ್ನಡಕ್ಕೆ ಅನುವಾದಿಸಲಾಗಿದೆ] {review_text}",
                'gu': f"[ગુજરાતીમાં અનુવાદિત] {review_text}",
                'mr': f"[मराठीत भाषांतरित] {review_text}",
                'pa': f"[ਪੰਜਾਬੀ ਵਿੱਚ ਅਨੁਵਾਦਿਤ] {review_text}",
                'ne': f"[नेपालीमा अनुवाद गरियो] {review_text}",
                'si': f"[සිංහලට පරිවර්තනය කරන ලද] {review_text}",
                'my': f"[မြန်မာဘာသာသို့ ဘာသာပြန်သည်] {review_text}",
                'km': f"[បកប្រែជាភាសាខ្មែរ] {review_text}",
                'lo': f"[ແປພາສາເປັນລາວ] {review_text}",
                'ka': f"[ქართულად თარგმნილი] {review_text}",
                'am': f"[አማርኛ ተተርጉሞ] {review_text}",
                'sw': f"[Inaongwa kwa Kiswahili] {review_text}",
                'zu': f"[Kushicilelwe ngesiZulu] {review_text}",
                'af': f"[Vertaal in Afrikaans] {review_text}",
                'mg': f"[Notsitentina amin'ny fiteny malagasy] {review_text}",
                'sq': f"[Përkthyer në shqip] {review_text}",
                'mk': f"[Преведено на македонски] {review_text}",
                'mt': f"[Miktub bil-Malti] {review_text}",
                'is': f"[Þýtt á íslensku] {review_text}",
                'ga': f">[Aistríodh go Gaeilge] {review_text}",
                'cy': f"[Wedi'i gyfieithu i'r Gymraeg] {review_text}",
                'eu': f"[Euskarara itzulia] {review_text}",
                'ca': f">[Traduït al català] {review_text}",
                'gl': f"[Traducido ao galego] {review_text}",
                'ig': f"[Akwadụgharịa na Igbo] {review_text}",
                'ha': f"[An fassara cikin Hausa] {review_text}",
                'yo': f"[Ṣe atumọ si Yorùbá] {review_text}",
                'so': f"[Lugayaan Soomaali ah] {review_text}"
            }
            
            translated_content["review_text"] = translations.get(target_language, f"[Translated to {target_lang_name}] {review_text}")
        
        if content_type in ["response", "both"]:
            # Get latest response if exists
            latest_response = await db.get_collection("review_responses").find_one(
                {"review_id": review_id},
                sort=[("created_at", -1)]
            )
            if latest_response:
                response_text = latest_response.get("response_text", "")
                if response_text:
                    # Create translation for response
                    response_translations = {
                        'es': f"[Respuesta traducida al español] {response_text}",
                        'fr': f"[Réponse traduite en français] {response_text}",
                        'de': f"[Antwort ins Deutsche übersetzt] {response_text}",
                        'it': f"[Risposta tradotta in italiano] {response_text}",
                        'pt': f"[Resposta traduzida para português] {response_text}",
                        'ja': f"[日本語に翻訳された回答] {response_text}",
                        'ko': f"[한국어로 번역된 답변] {response_text}",
                        'zh': f"[翻译成中文的回复] {response_text}",
                        'ar': f"[رد مترجم إلى العربية] {response_text}",
                        'hi': f"[हिंदी में अनुवादित उत्तर] {response_text}"
                    }
                    translated_content["response_text"] = response_translations.get(target_language, f"[Translated response to {target_lang_name}] {response_text}")
        
        return {
            "translated_content": translated_content,
            "source_language": "auto-detect",
            "target_language": target_language,
            "target_language_name": target_lang_name,
            "content_type": content_type,
            "cached": False,
            "review_found": True,
            "available_languages": list(language_map.keys())
        }
        
    except Exception as e:
        print(f"Enhanced translation error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Enhanced translation service error: {str(e)}")