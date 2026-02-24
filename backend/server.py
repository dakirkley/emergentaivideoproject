from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import base64
import io
import aiofiles

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="AI Creative Studio API")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/api/auth")
generation_router = APIRouter(prefix="/api/generate")
gallery_router = APIRouter(prefix="/api/gallery")
settings_router = APIRouter(prefix="/api/settings")
templates_router = APIRouter(prefix="/api/templates")
storyboard_router = APIRouter(prefix="/api/storyboards")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class APIKeys(BaseModel):
    user_id: str
    kling_api_key: Optional[str] = None
    fal_api_key: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    use_emergent_key: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class APIKeysUpdate(BaseModel):
    kling_api_key: Optional[str] = None
    fal_api_key: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    use_emergent_key: Optional[bool] = None

class GenerationRequest(BaseModel):
    prompt: str
    provider: str  # openai, fal, kling, elevenlabs
    model: Optional[str] = None
    image_url: Optional[str] = None
    duration: Optional[int] = 5
    aspect_ratio: Optional[str] = "16:9"
    voice_id: Optional[str] = None
    negative_prompt: Optional[str] = None

class PromptTemplate(BaseModel):
    template_id: str = Field(default_factory=lambda: f"tmpl_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None  # None for system templates
    name: str
    description: Optional[str] = None
    prompt: str
    type: Literal["image", "video", "voice"]
    provider: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []
    is_public: bool = False
    is_system: bool = False
    usage_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PromptTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    prompt: str
    type: Literal["image", "video", "voice"]
    provider: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []
    is_public: bool = False

class PromptTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    prompt: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None

# ==================== STORYBOARD MODELS ====================

class SceneMedia(BaseModel):
    media_id: str = Field(default_factory=lambda: f"media_{uuid.uuid4().hex[:8]}")
    type: Literal["image", "audio"]
    url: str
    filename: str
    duration: Optional[float] = None  # For audio files
    size: Optional[int] = None

class Scene(BaseModel):
    scene_id: str = Field(default_factory=lambda: f"scene_{uuid.uuid4().hex[:8]}")
    title: str = "Untitled Scene"
    script: str = ""
    image: Optional[SceneMedia] = None
    audio: Optional[SceneMedia] = None
    notes: str = ""
    tags: List[str] = []
    duration: Optional[float] = None
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Storyboard(BaseModel):
    storyboard_id: str = Field(default_factory=lambda: f"sb_{uuid.uuid4().hex[:10]}")
    user_id: str
    title: str = "Untitled Storyboard"
    description: str = ""
    scenes: List[Scene] = []
    thumbnail_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StoryboardCreate(BaseModel):
    title: str = "Untitled Storyboard"
    description: str = ""

class StoryboardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class SceneCreate(BaseModel):
    title: str = "Untitled Scene"
    script: str = ""
    notes: str = ""
    tags: List[str] = []

class SceneUpdate(BaseModel):
    title: Optional[str] = None
    script: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    duration: Optional[float] = None

class SceneReorder(BaseModel):
    scene_ids: List[str]  # Ordered list of scene IDs

class Generation(BaseModel):
    generation_id: str = Field(default_factory=lambda: f"gen_{uuid.uuid4().hex[:12]}")
    user_id: str
    type: Literal["image", "video", "voice"]
    provider: str
    model: Optional[str] = None
    prompt: str
    result_url: Optional[str] = None
    result_data: Optional[str] = None  # Base64 for audio
    status: Literal["pending", "processing", "completed", "failed"] = "pending"
    error_message: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> User:
    """Extract and validate user from session token"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

async def get_user_api_keys(user_id: str) -> APIKeys:
    """Get user's API keys"""
    keys_doc = await db.api_keys.find_one({"user_id": user_id}, {"_id": 0})
    if not keys_doc:
        return APIKeys(user_id=user_id)
    return APIKeys(**keys_doc)

# ==================== AUTH ROUTES ====================

@auth_router.get("/session")
async def get_session_data(request: Request):
    """Exchange session_id for user data and session_token"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=30.0
            )
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            data = response.json()
        except Exception as e:
            logger.error(f"Auth error: {e}")
            raise HTTPException(status_code=500, detail="Authentication failed")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data["name"], "picture": data.get("picture")}}
        )
    else:
        user_doc = {
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    session_token = data.get("session_token", str(uuid.uuid4()))
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    response = JSONResponse(content={
        "user": user_doc,
        "session_token": session_token
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return response

@auth_router.get("/me")
async def get_current_user_info(user: User = Depends(get_current_user)):
    """Get current user info"""
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture
    }

@auth_router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("session_token", path="/")
    return response

# ==================== SETTINGS ROUTES ====================

@settings_router.get("/api-keys")
async def get_api_keys(user: User = Depends(get_current_user)):
    """Get user's API keys (masked)"""
    keys = await get_user_api_keys(user.user_id)
    
    def mask_key(key: Optional[str]) -> Optional[str]:
        if not key:
            return None
        if len(key) <= 8:
            return "****"
        return key[:4] + "****" + key[-4:]
    
    return {
        "kling_api_key": mask_key(keys.kling_api_key),
        "fal_api_key": mask_key(keys.fal_api_key),
        "elevenlabs_api_key": mask_key(keys.elevenlabs_api_key),
        "openai_api_key": mask_key(keys.openai_api_key),
        "use_emergent_key": keys.use_emergent_key,
        "has_kling_key": bool(keys.kling_api_key),
        "has_fal_key": bool(keys.fal_api_key),
        "has_elevenlabs_key": bool(keys.elevenlabs_api_key),
        "has_openai_key": bool(keys.openai_api_key)
    }

@settings_router.put("/api-keys")
async def update_api_keys(keys_update: APIKeysUpdate, user: User = Depends(get_current_user)):
    """Update user's API keys"""
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if keys_update.kling_api_key is not None:
        update_data["kling_api_key"] = keys_update.kling_api_key if keys_update.kling_api_key else None
    if keys_update.fal_api_key is not None:
        update_data["fal_api_key"] = keys_update.fal_api_key if keys_update.fal_api_key else None
    if keys_update.elevenlabs_api_key is not None:
        update_data["elevenlabs_api_key"] = keys_update.elevenlabs_api_key if keys_update.elevenlabs_api_key else None
    if keys_update.openai_api_key is not None:
        update_data["openai_api_key"] = keys_update.openai_api_key if keys_update.openai_api_key else None
    if keys_update.use_emergent_key is not None:
        update_data["use_emergent_key"] = keys_update.use_emergent_key
    
    await db.api_keys.update_one(
        {"user_id": user.user_id},
        {"$set": update_data, "$setOnInsert": {"user_id": user.user_id}},
        upsert=True
    )
    
    return {"message": "API keys updated successfully"}

# ==================== GENERATION ROUTES ====================

@generation_router.post("/image")
async def generate_image(request: GenerationRequest, user: User = Depends(get_current_user)):
    """Generate image using OpenAI or Fal.ai"""
    keys = await get_user_api_keys(user.user_id)
    
    generation = Generation(
        user_id=user.user_id,
        type="image",
        provider=request.provider,
        model=request.model,
        prompt=request.prompt
    )
    
    try:
        if request.provider == "openai":
            api_key = keys.openai_api_key if not keys.use_emergent_key else os.environ.get("EMERGENT_LLM_KEY")
            if not api_key:
                raise HTTPException(status_code=400, detail="OpenAI API key not configured")
            
            from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
            
            image_gen = OpenAIImageGeneration(api_key=api_key)
            image_bytes_list = await image_gen.generate_images(
                prompt=request.prompt,
                model="gpt-image-1",
                number_of_images=1,
                quality="medium"
            )
            
            if image_bytes_list:
                image_b64 = base64.b64encode(image_bytes_list[0]).decode()
                generation.result_url = f"data:image/png;base64,{image_b64}"
            generation.status = "completed"
            
        elif request.provider == "fal":
            if not keys.fal_api_key:
                raise HTTPException(status_code=400, detail="Fal.ai API key not configured")
            
            os.environ["FAL_KEY"] = keys.fal_api_key
            import fal_client
            
            handler = await fal_client.submit_async(
                "fal-ai/flux/dev",
                arguments={"prompt": request.prompt}
            )
            result = await handler.get()
            
            if result and "images" in result and len(result["images"]) > 0:
                generation.result_url = result["images"][0].get("url")
            generation.status = "completed"
            
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {request.provider}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        generation.status = "failed"
        generation.error_message = str(e)
    
    gen_doc = generation.model_dump()
    gen_doc["created_at"] = gen_doc["created_at"].isoformat()
    await db.generations.insert_one(gen_doc)
    
    if generation.status == "failed":
        raise HTTPException(status_code=500, detail=generation.error_message)
    
    return {
        "generation_id": generation.generation_id,
        "result_url": generation.result_url,
        "status": generation.status
    }

@generation_router.post("/video")
async def generate_video(request: GenerationRequest, user: User = Depends(get_current_user)):
    """Generate video using Kling AI or Fal.ai"""
    keys = await get_user_api_keys(user.user_id)
    
    generation = Generation(
        user_id=user.user_id,
        type="video",
        provider=request.provider,
        model=request.model,
        prompt=request.prompt
    )
    
    try:
        if request.provider == "kling":
            if not keys.kling_api_key:
                raise HTTPException(status_code=400, detail="Kling AI API key not configured")
            
            model = request.model or "kling/v2-1-standard"
            
            payload = {
                "model": model,
                "input": {
                    "prompt": request.prompt,
                    "duration": str(request.duration or 5),
                    "aspect_ratio": request.aspect_ratio or "16:9"
                }
            }
            
            if request.negative_prompt:
                payload["input"]["negative_prompt"] = request.negative_prompt
            
            if request.image_url:
                payload["input"]["image_url"] = request.image_url
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.kie.ai/api/v1/jobs/createTask",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {keys.kling_api_key}",
                        "Content-Type": "application/json"
                    },
                    timeout=60.0
                )
                data = response.json()
                
                if data.get("code") != 200:
                    raise Exception(data.get("msg", "Kling API error"))
                
                task_id = data.get("data", {}).get("taskId")
                generation.metadata = {"kling_task_id": task_id}
                generation.status = "processing"
                
        elif request.provider == "fal":
            if not keys.fal_api_key:
                raise HTTPException(status_code=400, detail="Fal.ai API key not configured")
            
            os.environ["FAL_KEY"] = keys.fal_api_key
            import fal_client
            
            model = request.model or "fal-ai/kling-video/v2.1/standard/text-to-video"
            
            arguments = {
                "prompt": request.prompt,
                "duration": str(request.duration or 5),
                "aspect_ratio": request.aspect_ratio or "16:9"
            }
            
            if request.image_url:
                model = "fal-ai/kling-video/v2.1/standard/image-to-video"
                arguments["image_url"] = request.image_url
            
            handler = await fal_client.submit_async(model, arguments=arguments)
            result = await handler.get()
            
            if result and "video" in result:
                generation.result_url = result["video"].get("url")
            generation.status = "completed"
            
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {request.provider}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video generation error: {e}")
        generation.status = "failed"
        generation.error_message = str(e)
    
    gen_doc = generation.model_dump()
    gen_doc["created_at"] = gen_doc["created_at"].isoformat()
    await db.generations.insert_one(gen_doc)
    
    if generation.status == "failed":
        raise HTTPException(status_code=500, detail=generation.error_message)
    
    return {
        "generation_id": generation.generation_id,
        "result_url": generation.result_url,
        "status": generation.status,
        "metadata": generation.metadata
    }

@generation_router.get("/video/status/{generation_id}")
async def get_video_status(generation_id: str, user: User = Depends(get_current_user)):
    """Check video generation status for Kling AI"""
    gen_doc = await db.generations.find_one(
        {"generation_id": generation_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not gen_doc:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    if gen_doc["status"] in ["completed", "failed"]:
        return gen_doc
    
    if gen_doc["provider"] == "kling" and gen_doc.get("metadata", {}).get("kling_task_id"):
        keys = await get_user_api_keys(user.user_id)
        task_id = gen_doc["metadata"]["kling_task_id"]
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.kie.ai/api/v1/jobs/queryTask",
                json={"taskId": task_id},
                headers={
                    "Authorization": f"Bearer {keys.kling_api_key}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            data = response.json()
            
            if data.get("code") == 200:
                task_data = data.get("data", {})
                task_status = task_data.get("task_status")
                
                if task_status == "succeed":
                    video_url = task_data.get("task_result", {}).get("video", [None])[0]
                    await db.generations.update_one(
                        {"generation_id": generation_id},
                        {"$set": {"status": "completed", "result_url": video_url}}
                    )
                    gen_doc["status"] = "completed"
                    gen_doc["result_url"] = video_url
                elif task_status == "failed":
                    await db.generations.update_one(
                        {"generation_id": generation_id},
                        {"$set": {"status": "failed", "error_message": "Video generation failed"}}
                    )
                    gen_doc["status"] = "failed"
    
    return gen_doc

@generation_router.post("/voice")
async def generate_voice(request: GenerationRequest, user: User = Depends(get_current_user)):
    """Generate voice using ElevenLabs or Fal.ai"""
    keys = await get_user_api_keys(user.user_id)
    
    generation = Generation(
        user_id=user.user_id,
        type="voice",
        provider=request.provider,
        model=request.model,
        prompt=request.prompt
    )
    
    try:
        if request.provider == "elevenlabs":
            if not keys.elevenlabs_api_key:
                raise HTTPException(status_code=400, detail="ElevenLabs API key not configured")
            
            from elevenlabs import ElevenLabs
            from elevenlabs.core import VoiceSettings
            
            eleven_client = ElevenLabs(api_key=keys.elevenlabs_api_key)
            
            voice_id = request.voice_id or "21m00Tcm4TlvDq8ikWAM"  # Default voice
            
            audio_generator = eleven_client.text_to_speech.convert(
                text=request.prompt,
                voice_id=voice_id,
                model_id="eleven_multilingual_v2",
                voice_settings=VoiceSettings(
                    stability=0.5,
                    similarity_boost=0.75,
                    style=0.0,
                    use_speaker_boost=True
                )
            )
            
            audio_data = b""
            for chunk in audio_generator:
                audio_data += chunk
            
            audio_b64 = base64.b64encode(audio_data).decode()
            generation.result_data = audio_b64
            generation.result_url = f"data:audio/mpeg;base64,{audio_b64}"
            generation.status = "completed"
            
        elif request.provider == "fal":
            if not keys.fal_api_key:
                raise HTTPException(status_code=400, detail="Fal.ai API key not configured")
            
            os.environ["FAL_KEY"] = keys.fal_api_key
            import fal_client
            
            handler = await fal_client.submit_async(
                "fal-ai/f5-tts",
                arguments={
                    "gen_text": request.prompt,
                    "ref_audio_url": request.image_url  # Reference audio URL
                }
            )
            result = await handler.get()
            
            if result and "audio_url" in result:
                generation.result_url = result["audio_url"].get("url")
            generation.status = "completed"
            
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {request.provider}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice generation error: {e}")
        generation.status = "failed"
        generation.error_message = str(e)
    
    gen_doc = generation.model_dump()
    gen_doc["created_at"] = gen_doc["created_at"].isoformat()
    await db.generations.insert_one(gen_doc)
    
    if generation.status == "failed":
        raise HTTPException(status_code=500, detail=generation.error_message)
    
    return {
        "generation_id": generation.generation_id,
        "result_url": generation.result_url,
        "status": generation.status
    }

@generation_router.get("/voices")
async def get_available_voices(user: User = Depends(get_current_user)):
    """Get available ElevenLabs voices"""
    keys = await get_user_api_keys(user.user_id)
    
    if not keys.elevenlabs_api_key:
        return {"voices": []}
    
    try:
        from elevenlabs import ElevenLabs
        eleven_client = ElevenLabs(api_key=keys.elevenlabs_api_key)
        voices_response = eleven_client.voices.get_all()
        
        voices = [{"voice_id": v.voice_id, "name": v.name} for v in voices_response.voices]
        return {"voices": voices}
    except Exception as e:
        logger.error(f"Error fetching voices: {e}")
        return {"voices": []}

# ==================== FILE UPLOAD ====================

UPLOAD_DIR = Path("/tmp/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@generation_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    """Upload a file (image or audio) and return a URL"""
    
    # Validate file type
    allowed_image_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    allowed_audio_types = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/ogg", "audio/webm"]
    allowed_video_types = ["video/mp4", "video/webm", "video/quicktime"]
    
    content_type = file.content_type or ""
    
    if content_type not in allowed_image_types + allowed_audio_types + allowed_video_types:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {content_type}")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if file.filename else "bin"
    filename = f"{user.user_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    # Save file
    content = await file.read()
    
    # Check file size (max 50MB)
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")
    
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)
    
    # Store file info in DB
    file_doc = {
        "file_id": f"file_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "filename": filename,
        "original_name": file.filename,
        "content_type": content_type,
        "size": len(content),
        "filepath": str(filepath),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.uploads.insert_one(file_doc)
    
    # Convert to base64 data URL for immediate use
    b64_content = base64.b64encode(content).decode()
    data_url = f"data:{content_type};base64,{b64_content}"
    
    return {
        "file_id": file_doc["file_id"],
        "url": data_url,
        "filename": file.filename,
        "content_type": content_type,
        "size": len(content)
    }

# ==================== KLING AI ADVANCED FEATURES ====================

@generation_router.post("/video/avatar")
async def generate_avatar_video(
    prompt: str = Form(...),
    audio_file: UploadFile = File(None),
    audio_url: str = Form(None),
    avatar_image_url: str = Form(None),
    avatar_image_file: UploadFile = File(None),
    user: User = Depends(get_current_user)
):
    """Generate avatar video using Kling AI Avatar"""
    keys = await get_user_api_keys(user.user_id)
    
    if not keys.kling_api_key:
        raise HTTPException(status_code=400, detail="Kling AI API key not configured")
    
    generation = Generation(
        user_id=user.user_id,
        type="video",
        provider="kling",
        model="kling-avatar",
        prompt=prompt
    )
    
    try:
        # Process avatar image
        avatar_url = avatar_image_url
        if avatar_image_file:
            content = await avatar_image_file.read()
            avatar_url = f"data:image/png;base64,{base64.b64encode(content).decode()}"
        
        # Process audio
        audio_input_url = audio_url
        if audio_file:
            content = await audio_file.read()
            audio_input_url = f"data:audio/mpeg;base64,{base64.b64encode(content).decode()}"
        
        payload = {
            "model": "kling/v1-5-avatar",
            "input": {
                "prompt": prompt
            }
        }
        
        if avatar_url:
            payload["input"]["image_url"] = avatar_url
        if audio_input_url:
            payload["input"]["audio_url"] = audio_input_url
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.kie.ai/api/v1/jobs/createTask",
                json=payload,
                headers={
                    "Authorization": f"Bearer {keys.kling_api_key}",
                    "Content-Type": "application/json"
                },
                timeout=60.0
            )
            data = response.json()
            
            if data.get("code") != 200:
                raise Exception(data.get("msg", "Kling Avatar API error"))
            
            task_id = data.get("data", {}).get("taskId")
            generation.metadata = {"kling_task_id": task_id, "type": "avatar"}
            generation.status = "processing"
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Avatar generation error: {e}")
        generation.status = "failed"
        generation.error_message = str(e)
    
    gen_doc = generation.model_dump()
    gen_doc["created_at"] = gen_doc["created_at"].isoformat()
    await db.generations.insert_one(gen_doc)
    
    if generation.status == "failed":
        raise HTTPException(status_code=500, detail=generation.error_message)
    
    return {
        "generation_id": generation.generation_id,
        "status": generation.status,
        "metadata": generation.metadata
    }

@generation_router.post("/video/motion-control")
async def generate_motion_control_video(
    prompt: str = Form(...),
    image_file: UploadFile = File(None),
    image_url: str = Form(None),
    reference_video_file: UploadFile = File(None),
    reference_video_url: str = Form(None),
    character_orientation: str = Form("image"),
    user: User = Depends(get_current_user)
):
    """Generate video with motion control using Kling AI"""
    keys = await get_user_api_keys(user.user_id)
    
    if not keys.kling_api_key:
        raise HTTPException(status_code=400, detail="Kling AI API key not configured")
    
    generation = Generation(
        user_id=user.user_id,
        type="video",
        provider="kling",
        model="kling-motion-control",
        prompt=prompt
    )
    
    try:
        # Process source image
        source_image_url = image_url
        if image_file:
            content = await image_file.read()
            source_image_url = f"data:image/png;base64,{base64.b64encode(content).decode()}"
        
        if not source_image_url:
            raise HTTPException(status_code=400, detail="Source image is required for motion control")
        
        # Process reference video
        ref_video_url = reference_video_url
        if reference_video_file:
            content = await reference_video_file.read()
            ref_video_url = f"data:video/mp4;base64,{base64.b64encode(content).decode()}"
        
        if not ref_video_url:
            raise HTTPException(status_code=400, detail="Reference video is required for motion control")
        
        payload = {
            "model": "kling/v2-6-motion-control",
            "input": {
                "prompt": prompt,
                "image_url": source_image_url,
                "reference_video_url": ref_video_url,
                "character_orientation": character_orientation
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.kie.ai/api/v1/jobs/createTask",
                json=payload,
                headers={
                    "Authorization": f"Bearer {keys.kling_api_key}",
                    "Content-Type": "application/json"
                },
                timeout=60.0
            )
            data = response.json()
            
            if data.get("code") != 200:
                raise Exception(data.get("msg", "Kling Motion Control API error"))
            
            task_id = data.get("data", {}).get("taskId")
            generation.metadata = {"kling_task_id": task_id, "type": "motion-control"}
            generation.status = "processing"
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Motion control generation error: {e}")
        generation.status = "failed"
        generation.error_message = str(e)
    
    gen_doc = generation.model_dump()
    gen_doc["created_at"] = gen_doc["created_at"].isoformat()
    await db.generations.insert_one(gen_doc)
    
    if generation.status == "failed":
        raise HTTPException(status_code=500, detail=generation.error_message)
    
    return {
        "generation_id": generation.generation_id,
        "status": generation.status,
        "metadata": generation.metadata
    }

# ==================== VOICE CLONING ====================

@generation_router.post("/voice/clone")
async def clone_voice(
    voice_name: str = Form(...),
    description: str = Form(""),
    audio_files: List[UploadFile] = File(...),
    user: User = Depends(get_current_user)
):
    """Clone a voice using ElevenLabs IVC (Instant Voice Cloning)"""
    keys = await get_user_api_keys(user.user_id)
    
    if not keys.elevenlabs_api_key:
        raise HTTPException(status_code=400, detail="ElevenLabs API key not configured")
    
    try:
        from elevenlabs import ElevenLabs
        
        eleven_client = ElevenLabs(api_key=keys.elevenlabs_api_key)
        
        # Process uploaded audio files
        files_data = []
        for audio_file in audio_files:
            content = await audio_file.read()
            files_data.append((audio_file.filename, content))
        
        # Clone the voice using ElevenLabs IVC
        voice = eleven_client.clone(
            name=voice_name,
            description=description or f"Cloned voice for {user.email}",
            files=files_data
        )
        
        # Store cloned voice info
        voice_doc = {
            "voice_id": voice.voice_id,
            "user_id": user.user_id,
            "name": voice_name,
            "description": description,
            "provider": "elevenlabs",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.cloned_voices.insert_one(voice_doc)
        
        return {
            "voice_id": voice.voice_id,
            "name": voice_name,
            "status": "created"
        }
        
    except Exception as e:
        logger.error(f"Voice cloning error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@generation_router.get("/voice/cloned")
async def get_cloned_voices(user: User = Depends(get_current_user)):
    """Get user's cloned voices"""
    voices = await db.cloned_voices.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    return {"voices": voices}

@generation_router.delete("/voice/cloned/{voice_id}")
async def delete_cloned_voice(voice_id: str, user: User = Depends(get_current_user)):
    """Delete a cloned voice"""
    keys = await get_user_api_keys(user.user_id)
    
    # Verify ownership
    voice_doc = await db.cloned_voices.find_one(
        {"voice_id": voice_id, "user_id": user.user_id}
    )
    
    if not voice_doc:
        raise HTTPException(status_code=404, detail="Voice not found")
    
    try:
        if keys.elevenlabs_api_key:
            from elevenlabs import ElevenLabs
            eleven_client = ElevenLabs(api_key=keys.elevenlabs_api_key)
            eleven_client.voices.delete(voice_id)
    except Exception as e:
        logger.warning(f"Could not delete voice from ElevenLabs: {e}")
    
    await db.cloned_voices.delete_one({"voice_id": voice_id})
    
    return {"message": "Voice deleted"}


# ==================== GALLERY ROUTES ====================

@gallery_router.get("")
async def get_gallery(
    type: Optional[str] = None,
    limit: int = 50,
    user: User = Depends(get_current_user)
):
    """Get user's generation history"""
    query = {"user_id": user.user_id, "status": "completed"}
    if type:
        query["type"] = type
    
    generations = await db.generations.find(
        query,
        {"_id": 0, "result_data": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"generations": generations}

@gallery_router.delete("/{generation_id}")
async def delete_generation(generation_id: str, user: User = Depends(get_current_user)):
    """Delete a generation"""
    result = await db.generations.delete_one({
        "generation_id": generation_id,
        "user_id": user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    return {"message": "Generation deleted"}

# ==================== PROMPT TEMPLATES ====================

# System templates - pre-defined templates for all users
SYSTEM_TEMPLATES = [
    # Image templates
    {
        "template_id": "sys_img_portrait",
        "name": "Professional Portrait",
        "description": "Create a professional headshot portrait",
        "prompt": "Professional portrait photograph of a person, studio lighting, neutral background, sharp focus, high resolution, corporate headshot style",
        "type": "image",
        "provider": "openai",
        "category": "Portrait",
        "tags": ["portrait", "professional", "headshot"],
        "is_system": True,
        "is_public": True
    },
    {
        "template_id": "sys_img_landscape",
        "name": "Epic Landscape",
        "description": "Generate breathtaking landscape scenery",
        "prompt": "Breathtaking landscape photograph, golden hour lighting, dramatic sky, mountains in the distance, crystal clear lake reflection, ultra detailed, 8K resolution, award-winning photography",
        "type": "image",
        "provider": "openai",
        "category": "Nature",
        "tags": ["landscape", "nature", "scenic"],
        "is_system": True,
        "is_public": True
    },
    {
        "template_id": "sys_img_product",
        "name": "Product Photography",
        "description": "Clean product shot for e-commerce",
        "prompt": "Professional product photography, clean white background, soft studio lighting, sharp focus, commercial quality, e-commerce ready, high detail",
        "type": "image",
        "provider": "openai",
        "category": "Commercial",
        "tags": ["product", "commercial", "ecommerce"],
        "is_system": True,
        "is_public": True
    },
    {
        "template_id": "sys_img_cyberpunk",
        "name": "Cyberpunk City",
        "description": "Futuristic neon-lit cityscape",
        "prompt": "Cyberpunk cityscape at night, neon lights reflecting on wet streets, towering skyscrapers with holographic advertisements, flying vehicles, atmospheric fog, cinematic composition, blade runner style",
        "type": "image",
        "provider": "openai",
        "category": "Sci-Fi",
        "tags": ["cyberpunk", "futuristic", "city", "neon"],
        "is_system": True,
        "is_public": True
    },
    {
        "template_id": "sys_img_fantasy",
        "name": "Fantasy Art",
        "description": "Magical fantasy scene",
        "prompt": "Epic fantasy scene, magical forest with glowing particles, ancient ruins overgrown with luminescent plants, mystical atmosphere, volumetric lighting, highly detailed digital art, fantasy concept art style",
        "type": "image",
        "provider": "openai",
        "category": "Fantasy",
        "tags": ["fantasy", "magical", "art"],
        "is_system": True,
        "is_public": True
    },
    # Video templates
    {
        "template_id": "sys_vid_cinematic",
        "name": "Cinematic Scene",
        "description": "Movie-quality video with dramatic movement",
        "prompt": "Cinematic shot, slow camera pan, dramatic lighting, film grain, anamorphic lens flare, professional color grading, movie quality, 24fps film look",
        "type": "video",
        "provider": "kling",
        "category": "Cinematic",
        "tags": ["cinematic", "film", "dramatic"],
        "is_system": True,
        "is_public": True
    },
    {
        "template_id": "sys_vid_nature",
        "name": "Nature Documentary",
        "description": "Wildlife and nature footage style",
        "prompt": "Nature documentary style, smooth tracking shot, wildlife in natural habitat, golden hour lighting, National Geographic quality, pristine wilderness, gentle camera movement",
        "type": "video",
        "provider": "kling",
        "category": "Nature",
        "tags": ["nature", "documentary", "wildlife"],
        "is_system": True,
        "is_public": True
    },
    {
        "template_id": "sys_vid_timelapse",
        "name": "Urban Timelapse",
        "description": "City timelapse with flowing traffic",
        "prompt": "Urban timelapse, busy city streets, flowing car lights creating light trails, day to night transition, skyscrapers, clouds moving fast, hyperlapse effect",
        "type": "video",
        "provider": "kling",
        "category": "Urban",
        "tags": ["timelapse", "city", "urban"],
        "is_system": True,
        "is_public": True
    },
    {
        "template_id": "sys_vid_product",
        "name": "Product Showcase",
        "description": "360° product rotation video",
        "prompt": "Product showcase video, smooth 360 degree rotation, clean white background, soft studio lighting, product floating and slowly spinning, premium feel, commercial quality",
        "type": "video",
        "provider": "kling",
        "category": "Commercial",
        "tags": ["product", "showcase", "commercial"],
        "is_system": True,
        "is_public": True
    },
    # Voice templates
    {
        "template_id": "sys_voice_narrator",
        "name": "Documentary Narrator",
        "description": "Professional documentary-style narration",
        "prompt": "In a world where technology shapes our future... discover the untold stories that define our generation. This is a journey through innovation, creativity, and human potential.",
        "type": "voice",
        "provider": "elevenlabs",
        "category": "Narration",
        "tags": ["documentary", "narrator", "professional"],
        "is_system": True,
        "is_public": True
    },
    {
        "template_id": "sys_voice_commercial",
        "name": "Commercial Voiceover",
        "description": "Upbeat advertisement voice",
        "prompt": "Introducing the all-new experience you have been waiting for! With cutting-edge features and unparalleled quality, transform your everyday life. Available now. Limited time offer!",
        "type": "voice",
        "provider": "elevenlabs",
        "category": "Commercial",
        "tags": ["commercial", "advertisement", "upbeat"],
        "is_system": True,
        "is_public": True
    },
    {
        "template_id": "sys_voice_meditation",
        "name": "Meditation Guide",
        "description": "Calm and soothing meditation voice",
        "prompt": "Take a deep breath... and slowly exhale. Feel the tension leaving your body. With each breath, you become more relaxed... more peaceful. Let your mind settle into this moment of stillness.",
        "type": "voice",
        "provider": "elevenlabs",
        "category": "Wellness",
        "tags": ["meditation", "calm", "relaxation"],
        "is_system": True,
        "is_public": True
    },
    {
        "template_id": "sys_voice_podcast",
        "name": "Podcast Introduction",
        "description": "Engaging podcast intro style",
        "prompt": "Welcome back to another episode! I am so excited to have you here today. We have got an incredible conversation lined up that I know you are going to love. Let us dive right in!",
        "type": "voice",
        "provider": "elevenlabs",
        "category": "Podcast",
        "tags": ["podcast", "introduction", "engaging"],
        "is_system": True,
        "is_public": True
    }
]

@templates_router.get("")
async def get_templates(
    type: Optional[str] = None,
    category: Optional[str] = None,
    include_system: bool = True,
    favorites_only: bool = False,
    user: User = Depends(get_current_user)
):
    """Get prompt templates (system + user's custom templates)"""
    
    # Get user's favorites
    user_favorites = await db.template_favorites.find(
        {"user_id": user.user_id},
        {"_id": 0, "template_id": 1}
    ).to_list(1000)
    favorite_ids = {f["template_id"] for f in user_favorites}
    
    templates = []
    
    # Add system templates
    if include_system:
        for tmpl in SYSTEM_TEMPLATES:
            if type and tmpl["type"] != type:
                continue
            if category and tmpl.get("category") != category:
                continue
            template_with_fav = {**tmpl, "user_id": None, "usage_count": 0, "is_favorite": tmpl["template_id"] in favorite_ids}
            if favorites_only and not template_with_fav["is_favorite"]:
                continue
            templates.append(template_with_fav)
    
    # Get user's custom templates
    query = {"user_id": user.user_id}
    if type:
        query["type"] = type
    if category:
        query["category"] = category
    
    user_templates = await db.prompt_templates.find(
        query, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for tmpl in user_templates:
        tmpl["is_favorite"] = tmpl["template_id"] in favorite_ids
        if favorites_only and not tmpl["is_favorite"]:
            continue
        templates.append(tmpl)
    
    # Get public templates from other users
    if not favorites_only:
        public_query = {"is_public": True, "user_id": {"$ne": user.user_id}}
        if type:
            public_query["type"] = type
        if category:
            public_query["category"] = category
        
        public_templates = await db.prompt_templates.find(
            public_query, {"_id": 0}
        ).sort("usage_count", -1).limit(20).to_list(20)
        
        for tmpl in public_templates:
            tmpl["is_favorite"] = tmpl["template_id"] in favorite_ids
            templates.append(tmpl)
    
    return {"templates": templates, "favorites_count": len(favorite_ids)}

@templates_router.get("/categories")
async def get_template_categories(user: User = Depends(get_current_user)):
    """Get all available template categories"""
    categories = set()
    
    # From system templates
    for tmpl in SYSTEM_TEMPLATES:
        if tmpl.get("category"):
            categories.add(tmpl["category"])
    
    # From user templates
    user_categories = await db.prompt_templates.distinct("category", {"user_id": user.user_id})
    categories.update([c for c in user_categories if c])
    
    return {"categories": sorted(list(categories))}

@templates_router.post("")
async def create_template(
    template: PromptTemplateCreate,
    user: User = Depends(get_current_user)
):
    """Create a new prompt template"""
    template_doc = {
        "template_id": f"tmpl_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "name": template.name,
        "description": template.description,
        "prompt": template.prompt,
        "type": template.type,
        "provider": template.provider,
        "category": template.category,
        "tags": template.tags,
        "is_public": template.is_public,
        "is_system": False,
        "usage_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.prompt_templates.insert_one(template_doc)
    
    return {
        "template_id": template_doc["template_id"],
        "message": "Template created successfully"
    }

@templates_router.get("/{template_id}")
async def get_template(template_id: str, user: User = Depends(get_current_user)):
    """Get a specific template"""
    # Check system templates first
    for tmpl in SYSTEM_TEMPLATES:
        if tmpl["template_id"] == template_id:
            return tmpl
    
    # Check user templates
    template = await db.prompt_templates.find_one(
        {"template_id": template_id},
        {"_id": 0}
    )
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check access
    if template["user_id"] != user.user_id and not template.get("is_public"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return template

@templates_router.put("/{template_id}")
async def update_template(
    template_id: str,
    update: PromptTemplateUpdate,
    user: User = Depends(get_current_user)
):
    """Update a prompt template"""
    # Can't update system templates
    for tmpl in SYSTEM_TEMPLATES:
        if tmpl["template_id"] == template_id:
            raise HTTPException(status_code=400, detail="Cannot modify system templates")
    
    # Verify ownership
    template = await db.prompt_templates.find_one(
        {"template_id": template_id, "user_id": user.user_id}
    )
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = {}
    if update.name is not None:
        update_data["name"] = update.name
    if update.description is not None:
        update_data["description"] = update.description
    if update.prompt is not None:
        update_data["prompt"] = update.prompt
    if update.category is not None:
        update_data["category"] = update.category
    if update.tags is not None:
        update_data["tags"] = update.tags
    if update.is_public is not None:
        update_data["is_public"] = update.is_public
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.prompt_templates.update_one(
            {"template_id": template_id},
            {"$set": update_data}
        )
    
    return {"message": "Template updated successfully"}

@templates_router.delete("/{template_id}")
async def delete_template(template_id: str, user: User = Depends(get_current_user)):
    """Delete a prompt template"""
    # Can't delete system templates
    for tmpl in SYSTEM_TEMPLATES:
        if tmpl["template_id"] == template_id:
            raise HTTPException(status_code=400, detail="Cannot delete system templates")
    
    result = await db.prompt_templates.delete_one({
        "template_id": template_id,
        "user_id": user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted"}

@templates_router.post("/{template_id}/favorite")
async def favorite_template(template_id: str, user: User = Depends(get_current_user)):
    """Add a template to favorites"""
    # Verify template exists (system or user template)
    template_exists = False
    
    # Check system templates
    for tmpl in SYSTEM_TEMPLATES:
        if tmpl["template_id"] == template_id:
            template_exists = True
            break
    
    # Check user templates
    if not template_exists:
        template = await db.prompt_templates.find_one({"template_id": template_id})
        if template:
            # Check access - must be owner or public
            if template["user_id"] == user.user_id or template.get("is_public"):
                template_exists = True
    
    if not template_exists:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check if already favorited
    existing = await db.template_favorites.find_one({
        "user_id": user.user_id,
        "template_id": template_id
    })
    
    if existing:
        return {"message": "Template already in favorites", "is_favorite": True}
    
    # Add to favorites
    await db.template_favorites.insert_one({
        "user_id": user.user_id,
        "template_id": template_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Template added to favorites", "is_favorite": True}

@templates_router.delete("/{template_id}/favorite")
async def unfavorite_template(template_id: str, user: User = Depends(get_current_user)):
    """Remove a template from favorites"""
    await db.template_favorites.delete_one({
        "user_id": user.user_id,
        "template_id": template_id
    })
    
    return {"message": "Template removed from favorites", "is_favorite": False}

@templates_router.get("/favorites/list")
async def get_favorite_templates(user: User = Depends(get_current_user)):
    """Get all favorite template IDs for the user"""
    favorites = await db.template_favorites.find(
        {"user_id": user.user_id},
        {"_id": 0, "template_id": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(1000)
    
    return {"favorites": favorites}


@templates_router.post("/{template_id}/use")
async def use_template(template_id: str, user: User = Depends(get_current_user)):
    """Record template usage and return the template"""
    # Check system templates
    for tmpl in SYSTEM_TEMPLATES:
        if tmpl["template_id"] == template_id:
            return {"prompt": tmpl["prompt"], "template": tmpl}
    
    # Check user/public templates
    template = await db.prompt_templates.find_one(
        {"template_id": template_id},
        {"_id": 0}
    )
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check access
    if template["user_id"] != user.user_id and not template.get("is_public"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Increment usage count
    await db.prompt_templates.update_one(
        {"template_id": template_id},
        {"$inc": {"usage_count": 1}}
    )
    
    return {"prompt": template["prompt"], "template": template}

# ==================== STORYBOARD ROUTES ====================

@storyboard_router.get("")
async def get_storyboards(user: User = Depends(get_current_user)):
    """Get all storyboards for the user"""
    storyboards = await db.storyboards.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    # Add thumbnail from first scene if available
    for sb in storyboards:
        if sb.get("scenes") and len(sb["scenes"]) > 0:
            first_scene = sb["scenes"][0]
            if first_scene.get("image"):
                sb["thumbnail_url"] = first_scene["image"].get("url")
    
    return {"storyboards": storyboards}

@storyboard_router.post("")
async def create_storyboard(
    data: StoryboardCreate,
    user: User = Depends(get_current_user)
):
    """Create a new storyboard"""
    storyboard = Storyboard(
        user_id=user.user_id,
        title=data.title,
        description=data.description,
        scenes=[
            Scene(
                title="Scene 1 — Opening",
                script="This is where the story begins...",
                order=0
            ).model_dump()
        ]
    )
    
    sb_doc = storyboard.model_dump()
    sb_doc["created_at"] = sb_doc["created_at"].isoformat()
    sb_doc["updated_at"] = sb_doc["updated_at"].isoformat()
    for scene in sb_doc["scenes"]:
        scene["created_at"] = scene["created_at"].isoformat()
        scene["updated_at"] = scene["updated_at"].isoformat()
    
    await db.storyboards.insert_one(sb_doc)
    
    return {"storyboard_id": storyboard.storyboard_id, "storyboard": sb_doc}

@storyboard_router.get("/{storyboard_id}")
async def get_storyboard(storyboard_id: str, user: User = Depends(get_current_user)):
    """Get a specific storyboard"""
    storyboard = await db.storyboards.find_one(
        {"storyboard_id": storyboard_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not storyboard:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    
    return {"storyboard": storyboard}

@storyboard_router.put("/{storyboard_id}")
async def update_storyboard(
    storyboard_id: str,
    data: StoryboardUpdate,
    user: User = Depends(get_current_user)
):
    """Update storyboard metadata"""
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.title is not None:
        update_data["title"] = data.title
    if data.description is not None:
        update_data["description"] = data.description
    
    result = await db.storyboards.update_one(
        {"storyboard_id": storyboard_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    
    return {"message": "Storyboard updated"}

@storyboard_router.delete("/{storyboard_id}")
async def delete_storyboard(storyboard_id: str, user: User = Depends(get_current_user)):
    """Delete a storyboard"""
    result = await db.storyboards.delete_one({
        "storyboard_id": storyboard_id,
        "user_id": user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    
    return {"message": "Storyboard deleted"}

# Scene routes
@storyboard_router.post("/{storyboard_id}/scenes")
async def add_scene(
    storyboard_id: str,
    data: SceneCreate,
    user: User = Depends(get_current_user)
):
    """Add a new scene to the storyboard"""
    storyboard = await db.storyboards.find_one(
        {"storyboard_id": storyboard_id, "user_id": user.user_id}
    )
    
    if not storyboard:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    
    # Get next order number
    scenes = storyboard.get("scenes", [])
    next_order = len(scenes)
    
    scene = Scene(
        title=data.title,
        script=data.script,
        notes=data.notes,
        tags=data.tags,
        order=next_order
    )
    
    scene_doc = scene.model_dump()
    scene_doc["created_at"] = scene_doc["created_at"].isoformat()
    scene_doc["updated_at"] = scene_doc["updated_at"].isoformat()
    
    await db.storyboards.update_one(
        {"storyboard_id": storyboard_id},
        {
            "$push": {"scenes": scene_doc},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"scene_id": scene.scene_id, "scene": scene_doc}

@storyboard_router.put("/{storyboard_id}/scenes/{scene_id}")
async def update_scene(
    storyboard_id: str,
    scene_id: str,
    data: SceneUpdate,
    user: User = Depends(get_current_user)
):
    """Update a scene"""
    storyboard = await db.storyboards.find_one(
        {"storyboard_id": storyboard_id, "user_id": user.user_id}
    )
    
    if not storyboard:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    
    # Find and update scene
    scenes = storyboard.get("scenes", [])
    scene_index = next((i for i, s in enumerate(scenes) if s["scene_id"] == scene_id), None)
    
    if scene_index is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Update scene fields
    if data.title is not None:
        scenes[scene_index]["title"] = data.title
    if data.script is not None:
        scenes[scene_index]["script"] = data.script
    if data.notes is not None:
        scenes[scene_index]["notes"] = data.notes
    if data.tags is not None:
        scenes[scene_index]["tags"] = data.tags
    if data.duration is not None:
        scenes[scene_index]["duration"] = data.duration
    
    scenes[scene_index]["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.storyboards.update_one(
        {"storyboard_id": storyboard_id},
        {
            "$set": {
                "scenes": scenes,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Scene updated", "scene": scenes[scene_index]}

@storyboard_router.delete("/{storyboard_id}/scenes/{scene_id}")
async def delete_scene(
    storyboard_id: str,
    scene_id: str,
    user: User = Depends(get_current_user)
):
    """Delete a scene"""
    result = await db.storyboards.update_one(
        {"storyboard_id": storyboard_id, "user_id": user.user_id},
        {
            "$pull": {"scenes": {"scene_id": scene_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    
    return {"message": "Scene deleted"}

@storyboard_router.put("/{storyboard_id}/scenes/reorder")
async def reorder_scenes(
    storyboard_id: str,
    data: SceneReorder,
    user: User = Depends(get_current_user)
):
    """Reorder scenes in a storyboard"""
    storyboard = await db.storyboards.find_one(
        {"storyboard_id": storyboard_id, "user_id": user.user_id}
    )
    
    if not storyboard:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    
    scenes = storyboard.get("scenes", [])
    scene_map = {s["scene_id"]: s for s in scenes}
    
    # Reorder based on provided IDs
    reordered_scenes = []
    for i, scene_id in enumerate(data.scene_ids):
        if scene_id in scene_map:
            scene = scene_map[scene_id]
            scene["order"] = i
            reordered_scenes.append(scene)
    
    await db.storyboards.update_one(
        {"storyboard_id": storyboard_id},
        {
            "$set": {
                "scenes": reordered_scenes,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Scenes reordered"}

@storyboard_router.post("/{storyboard_id}/scenes/{scene_id}/media")
async def upload_scene_media(
    storyboard_id: str,
    scene_id: str,
    media_type: str = Form(...),  # "image" or "audio"
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    """Upload media to a scene"""
    storyboard = await db.storyboards.find_one(
        {"storyboard_id": storyboard_id, "user_id": user.user_id}
    )
    
    if not storyboard:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    
    # Validate media type
    if media_type not in ["image", "audio"]:
        raise HTTPException(status_code=400, detail="Invalid media type")
    
    # Validate file type
    content_type = file.content_type or ""
    if media_type == "image" and not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid image file")
    if media_type == "audio" and not content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid audio file")
    
    # Read file content
    content = await file.read()
    
    # Check file size (max 50MB)
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")
    
    # Create data URL
    b64_content = base64.b64encode(content).decode()
    data_url = f"data:{content_type};base64,{b64_content}"
    
    # Calculate audio duration if applicable
    duration = None
    if media_type == "audio":
        # Estimate duration based on file size (rough estimate)
        # In production, you'd use a proper audio library
        duration = len(content) / 16000  # Rough estimate for 128kbps
    
    media = SceneMedia(
        type=media_type,
        url=data_url,
        filename=file.filename or "unnamed",
        duration=duration,
        size=len(content)
    )
    
    # Update scene
    scenes = storyboard.get("scenes", [])
    scene_index = next((i for i, s in enumerate(scenes) if s["scene_id"] == scene_id), None)
    
    if scene_index is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    scenes[scene_index][media_type] = media.model_dump()
    scenes[scene_index]["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.storyboards.update_one(
        {"storyboard_id": storyboard_id},
        {
            "$set": {
                "scenes": scenes,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": f"{media_type.capitalize()} uploaded", "media": media.model_dump()}

@storyboard_router.delete("/{storyboard_id}/scenes/{scene_id}/media/{media_type}")
async def delete_scene_media(
    storyboard_id: str,
    scene_id: str,
    media_type: str,
    user: User = Depends(get_current_user)
):
    """Delete media from a scene"""
    if media_type not in ["image", "audio"]:
        raise HTTPException(status_code=400, detail="Invalid media type")
    
    storyboard = await db.storyboards.find_one(
        {"storyboard_id": storyboard_id, "user_id": user.user_id}
    )
    
    if not storyboard:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    
    scenes = storyboard.get("scenes", [])
    scene_index = next((i for i, s in enumerate(scenes) if s["scene_id"] == scene_id), None)
    
    if scene_index is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    scenes[scene_index][media_type] = None
    scenes[scene_index]["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.storyboards.update_one(
        {"storyboard_id": storyboard_id},
        {
            "$set": {
                "scenes": scenes,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": f"{media_type.capitalize()} removed"}

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "AI Creative Studio API", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include routers
app.include_router(api_router)
app.include_router(auth_router)
app.include_router(generation_router)
app.include_router(gallery_router)
app.include_router(settings_router)
app.include_router(templates_router)
app.include_router(storyboard_router)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
