import os
import json
import socket
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
import qrcode
from io import BytesIO
import base64
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, StreamingResponse, HTMLResponse, RedirectResponse, FileResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from zeroconf import ServiceInfo, Zeroconf
import threading
import time

# Data models
class LogEntry(BaseModel):
    message: str
    voice_input: bool = False
    session_id: Optional[str] = None

class ClarificationResponse(BaseModel):
    response: str
    session_id: str

class ScheduleConfig(BaseModel):
    reminders: List[Dict[str, Any]]
    timezone: str = "UTC"

class SettingsConfig(BaseModel):
    input_mode: str = "voice"  # voice, text, both
    llm_model: str = "llama2"
    llm_backend: str = "ollama"  # ollama, llamacpp
    theme: str = "light"
    accessibility: Dict[str, Any] = {}

# Initialize FastAPI app
app = FastAPI(title="NDK Tracker Backend", version="1.0.0")

# Initialize templates with PyInstaller-compatible path
import sys
if getattr(sys, 'frozen', False):
    # Running as PyInstaller bundle
    template_dir = Path(sys._MEIPASS) / "templates"
    frontend_dir = Path(sys._MEIPASS) / "frontend" / "build"
else:
    # Running as script
    template_dir = "templates"
    frontend_dir = Path("../frontend/build")

templates = Jinja2Templates(directory=str(template_dir))

# Mount PWA static files if they exist
if frontend_dir.exists():
    app.mount("/pwa", StaticFiles(directory=str(frontend_dir), html=True), name="pwa")
    print(f"PWA mounted at /pwa from {frontend_dir}")
else:
    print(f"PWA files not found at {frontend_dir}")

@app.get("/pwa", response_class=HTMLResponse)
async def pwa_root():
    """Serve PWA index for /pwa (no trailing slash) to prevent 307 redirect issues"""
    index_path = Path(frontend_dir) / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    raise HTTPException(status_code=404, detail="PWA not built. Run npm run build in frontend/")

# CORS middleware to allow PWA access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to known origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data storage paths
DATA_DIR = Path("./data")
SESSIONS_DIR = DATA_DIR / "sessions"
SETTINGS_FILE = DATA_DIR / "settings.json"
SCHEDULE_FILE = DATA_DIR / "schedule.json"

# Ensure data directories exist
DATA_DIR.mkdir(exist_ok=True)
SESSIONS_DIR.mkdir(exist_ok=True)

# In-memory session storage for ongoing conversations
active_sessions: Dict[str, Dict] = {}

class DataManager:
    """Manages local JSON file storage"""
    
    @staticmethod
    def save_session(session_data: Dict) -> str:
        """Save a complete session to daily JSON file"""
        date_str = datetime.now().strftime("%Y-%m-%d")
        file_path = SESSIONS_DIR / f"{date_str}.json"
        
        # Load existing data or create new
        if file_path.exists():
            with open(file_path, 'r') as f:
                daily_data = json.load(f)
        else:
            daily_data = {"date": date_str, "sessions": []}
        
        # Add new session
        daily_data["sessions"].append(session_data)
        
        # Save back to file
        with open(file_path, 'w') as f:
            json.dump(daily_data, f, indent=2, default=str)
        
        return str(file_path)
    
    @staticmethod
    def get_daily_data(date: str) -> Dict:
        """Retrieve data for a specific date"""
        file_path = SESSIONS_DIR / f"{date}.json"
        if file_path.exists():
            with open(file_path, 'r') as f:
                return json.load(f)
        return {"date": date, "sessions": []}
    
    @staticmethod
    def get_date_range_data(start_date: str, end_date: str) -> List[Dict]:
        """Get data for a date range"""
        # Simple implementation - can be optimized
        from dateutil.parser import parse
        from dateutil.rrule import rrule, DAILY
        
        start = parse(start_date).date()
        end = parse(end_date).date()
        
        data = []
        for dt in rrule(DAILY, dtstart=start, until=end):
            date_str = dt.strftime("%Y-%m-%d")
            daily_data = DataManager.get_daily_data(date_str)
            if daily_data["sessions"]:
                data.append(daily_data)
        
        return data

class LLMProcessor:
    """Handles local LLM processing for conversation and data extraction"""
    
    def __init__(self, model_name: str = "llama2", llm_backend: str = "ollama"):
        # Override backend from environment if set (used by minimal_setup.py)
        env_backend = os.environ.get('DEFAULT_LLM_BACKEND')
        if env_backend:
            llm_backend = env_backend
            print(f"Using LLM backend from environment: {llm_backend}")
        
        self.model_name = model_name
        self.llm_backend = llm_backend  # "ollama" or "llamacpp"
        self.ollama_available = False
        self.llamacpp_available = False
        self.llm_instance = None
        
        # Check available backends
        self._check_ollama()
        self._check_llamacpp()
        
        # Select the best available backend
        if llm_backend == "llamacpp" and self.llamacpp_available:
            self._init_llamacpp()
        elif llm_backend == "ollama" and self.ollama_available:
            pass  # Ollama doesn't need initialization
        elif self.ollama_available:
            self.llm_backend = "ollama"
            print("Falling back to Ollama")
        elif self.llamacpp_available:
            self.llm_backend = "llamacpp" 
            self._init_llamacpp()
            print("Falling back to llama.cpp")
        else:
            print("No LLM backend available, using keyword fallback")
    
    def _check_ollama(self):
        """Check if Ollama is available"""
        try:
            import ollama
            # Test connection
            ollama.list()
            self.ollama_available = True
            print("Ollama backend available")
        except Exception as e:
            print(f"Ollama not available: {e}")
            self.ollama_available = False
    
    def _check_llamacpp(self):
        """Check if llama-cpp-python is available"""
        try:
            from llama_cpp import Llama
            self.llamacpp_available = True
            print("llama.cpp backend available")
        except ImportError as e:
            print(f"llama.cpp not available: {e}")
            self.llamacpp_available = False
    
    def _init_llamacpp(self):
        """Initialize llama.cpp model"""
        try:
            from llama_cpp import Llama
            
            # Check for environment variable first (set by minimal_setup.py)
            env_model_path = os.environ.get('LLAMA_CPP_MODEL_PATH')
            if env_model_path and Path(env_model_path).exists():
                model_path = env_model_path
                print(f"Using model from environment: {model_path}")
            else:
                # Fallback to predefined model paths
                model_paths = {
                    "llama2": "./models/llama-2-7b-chat.Q4_K_M.gguf",
                    "llama3": "./models/llama-3-8b-instruct.Q4_K_M.gguf", 
                    "mistral": "./models/mistral-7b-instruct-v0.2.Q4_K_M.gguf",
                    "codellama": "./models/codellama-7b-instruct.Q4_K_M.gguf"
                }
                
                model_path = model_paths.get(self.model_name)
                if not model_path or not Path(model_path).exists():
                    # Try to find any .gguf model in models directory
                    models_dir = Path("./models")
                    if models_dir.exists():
                        gguf_files = list(models_dir.glob("*.gguf"))
                        if gguf_files:
                            model_path = str(gguf_files[0])
                            print(f"Using found model: {model_path}")
                        else:
                            raise FileNotFoundError("No .gguf models found in ./models/ directory")
                    else:
                        raise FileNotFoundError("./models/ directory not found")
            
            # Initialize llama.cpp with optimized settings
            self.llm_instance = Llama(
                model_path=model_path,
                n_ctx=2048,  # Context window
                n_threads=None,  # Use all available threads
                n_gpu_layers=0,  # Use GPU if available (set to -1 for full GPU)
                verbose=False
            )
            print(f"llama.cpp initialized with model: {model_path}")
            
        except Exception as e:
            print(f"Failed to initialize llama.cpp: {e}")
            self.llamacpp_available = False
            self.llm_instance = None
    
    def process_input(self, user_input: str, context: Dict = None) -> Dict:
        """Process user input and extract structured data"""
        if self.llm_backend == "ollama" and self.ollama_available:
            return self._process_with_ollama(user_input, context)
        elif self.llm_backend == "llamacpp" and self.llamacpp_available:
            return self._process_with_llamacpp(user_input, context)
        else:
            return self._fallback_processing(user_input, context)
    
    def _process_with_ollama(self, user_input: str, context: Dict = None) -> Dict:
        """Process input using Ollama"""
        try:
            import ollama
            
            prompt = self._build_extraction_prompt(user_input, context)
            response = ollama.generate(model=self.model_name, prompt=prompt)
            
            # Parse the LLM response
            return self._parse_llm_response(response['response'], user_input)
            
        except Exception as e:
            print(f"Ollama processing error: {e}")
            return self._fallback_processing(user_input, context)
    
    def _process_with_llamacpp(self, user_input: str, context: Dict = None) -> Dict:
        """Process input using llama.cpp"""
        try:
            if not self.llm_instance:
                raise Exception("llama.cpp model not initialized")
            
            prompt = self._build_extraction_prompt(user_input, context)
            
            # Generate response using llama.cpp
            response = self.llm_instance(
                prompt,
                max_tokens=512,
                temperature=0.7,
                top_p=0.9,
                echo=False,
                stop=["</s>", "\n\n"]
            )
            
            response_text = response['choices'][0]['text'].strip()
            
            # Parse the LLM response
            return self._parse_llm_response(response_text, user_input)
            
        except Exception as e:
            print(f"llama.cpp processing error: {e}")
            return self._fallback_processing(user_input, context)
    
    def _build_extraction_prompt(self, user_input: str, context: Dict = None) -> str:
        """Build prompt for data extraction"""
        prompt = f"""
You are helping extract structured data from user input about daily activities for a neurodiverse child.

Categories to extract:
- food: what was eaten
- medication: any meds taken  
- behavior: mood, activities, incidents
- exercise: physical activities
- water: fluid intake
- potty: bathroom activities
- school: feedback, events, notes

User input: "{user_input}"

Please extract relevant information and identify any missing details that need clarification.

Respond in JSON format:
{{
    "extracted_data": {{
        "food": [],
        "medication": [],
        "behavior": [],
        "exercise": [],
        "water": [],
        "potty": [],
        "school": []
    }},
    "missing_info": [],
    "clarification_question": "optional question if info is missing or unclear",
    "confidence": 0.8
}}
"""
        return prompt
    
    def _parse_llm_response(self, response: str, original_input: str) -> Dict:
        """Parse LLM JSON response"""
        try:
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except:
            pass
        
        # Fallback if JSON parsing fails
        return self._fallback_processing(original_input)
    
    def _fallback_processing(self, user_input: str, context: Dict = None) -> Dict:
        """Simple keyword-based processing when LLM unavailable"""
        extracted_data = {
            "food": [],
            "medication": [],
            "behavior": [],
            "exercise": [],
            "water": [],
            "potty": [],
            "school": []
        }
        
        # Simple keyword matching
        input_lower = user_input.lower()
        
        # Food keywords
        food_words = ["ate", "food", "lunch", "dinner", "breakfast", "snack", "drink"]
        if any(word in input_lower for word in food_words):
            extracted_data["food"].append(user_input)
        
        # Medication keywords
        med_words = ["medication", "medicine", "pill", "dose", "took"]
        if any(word in input_lower for word in med_words):
            extracted_data["medication"].append(user_input)
        
        # Behavior keywords
        behavior_words = ["happy", "sad", "angry", "calm", "meltdown", "behavior"]
        if any(word in input_lower for word in behavior_words):
            extracted_data["behavior"].append(user_input)
        
        return {
            "extracted_data": extracted_data,
            "missing_info": [],
            "clarification_question": None,
            "confidence": 0.6
        }
    
    def switch_backend(self, backend: str, model_name: str = None):
        """Switch LLM backend at runtime"""
        if model_name:
            self.model_name = model_name
            
        if backend == "ollama" and self.ollama_available:
            self.llm_backend = "ollama"
            print(f"Switched to Ollama backend with model: {self.model_name}")
        elif backend == "llamacpp" and self.llamacpp_available:
            self.llm_backend = "llamacpp"
            if not self.llm_instance or model_name:
                self._init_llamacpp()
            print(f"Switched to llama.cpp backend with model: {self.model_name}")
        else:
            print(f"Backend {backend} not available")
    
    def get_available_backends(self):
        """Get list of available LLM backends"""
        backends = []
        if self.ollama_available:
            backends.append("ollama")
        if self.llamacpp_available:
            backends.append("llamacpp")
        return backends
    
    def get_status(self):
        """Get current LLM processor status"""
        return {
            "current_backend": self.llm_backend,
            "current_model": self.model_name,
            "ollama_available": self.ollama_available,
            "llamacpp_available": self.llamacpp_available,
            "available_backends": self.get_available_backends()
        }

# Initialize LLM processor with default settings
llm_processor = LLMProcessor()

def get_local_ip():
    """Get the local IP address"""
    try:
        # Connect to a remote address to get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except:
        return "127.0.0.1"

def generate_qr_code(data: str) -> str:
    """Generate QR code as base64 image"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"

# API Endpoints

def _build_base_url(request: Request) -> str:
    """Build base URL (scheme://host:port) from the incoming request to avoid hardcoded ports"""
    # request.url.scheme can be http/https
    scheme = request.url.scheme
    # Use host header (may include port) or fallback to url components
    host = request.headers.get("host") or request.client.host
    return f"{scheme}://{host}"


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """Serve the main pairing page with QR code at root"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/status", response_class=HTMLResponse)
async def status_page(request: Request):
    """Status and API testing page"""
    return templates.TemplateResponse("status.html", {"request": request})

@app.get("/api")
async def root_api(request: Request):
    """API version of root endpoint (for backward compatibility)"""
    local_ip = get_local_ip()
    base_url = _build_base_url(request)
    
    return {
        "message": "NDK Tracker Backend",
        "status": "running",
        "pairing_info": {
            "endpoint": base_url,
            "qr_code": generate_qr_code(base_url),
            "local_ip": local_ip,
            "port": request.url.port
        }
    }

@app.get("/pair", response_class=HTMLResponse)
async def pairing_page(request: Request):
    """Pairing page with PWA install link"""
    local_ip = get_local_ip()
    scheme = request.url.scheme
    port = request.url.port or 8000
    # Prefer HTTPS port 8443 if available
    https_port = 8443
    lan_https = f"https://{local_ip}:{https_port}"
    lan_http = f"http://{local_ip}:{port}"
    lan_base = lan_https
    # Pass backend URL and install hint to PWA so it can auto-configure and prompt install
    pwa_url = f"{lan_base}/pwa?backend={lan_base}&install=1"
    api_endpoint = lan_base
    
    return templates.TemplateResponse("pairing.html", {
        "request": request,
        "pwa_url": pwa_url,
        "api_endpoint": api_endpoint,
        "local_ip": local_ip,
        "port": port
    })

@app.get("/pairing/info")
async def get_pairing_info(request: Request):
    """Get pairing information for QR code display"""
    local_ip = get_local_ip()
    scheme = request.url.scheme
    port = request.url.port or 8000
    host_base = _build_base_url(request)
    https_port = 8443
    lan_https = f"https://{local_ip}:{https_port}"
    lan_http = f"http://{local_ip}:{port}"
    pairing_url = f"{lan_https}/pair"
    
    return {
        "endpoint": host_base,
        "endpoint_lan": lan_https,
        "endpoint_lan_http": lan_http,
        "pairing_url": pairing_url,
        "qr_code": generate_qr_code(pairing_url),
        "local_ip": local_ip,
        "port": port,
        "instructions": [
            "1. Scan the QR code with your mobile device camera",
            "2. This will open the pairing page in your browser (you may need to accept a self-signed certificate warning)",
            "3. Tap 'Install PWA' to download the NDK Tracker app",
            "4. Open the installed PWA and it will connect automatically"
        ]
    }

@app.post("/input/log")
async def log_entry(entry: LogEntry):
    """Process and log a new entry"""
    session_id = entry.session_id or f"session_{int(time.time())}"
    
    # Process input with LLM
    processed = llm_processor.process_input(entry.message)
    
    # Create or update session
    if session_id not in active_sessions:
        active_sessions[session_id] = {
            "session_id": session_id,
            "start_time": datetime.now(timezone.utc).isoformat(),
            "conversation": [],
            "raw_text_aggregate": "",
            "structured_data": {},
            "status": "in_progress"
        }
    
    session = active_sessions[session_id]
    
    # Add to conversation history
    session["conversation"].append({
        "from": "user",
        "message": entry.message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "voice_input": entry.voice_input
    })
    
    # Update aggregated text
    session["raw_text_aggregate"] += f" {entry.message}"
    
    # Update structured data
    for category, data in processed["extracted_data"].items():
        if data:
            if category not in session["structured_data"]:
                session["structured_data"][category] = []
            session["structured_data"][category].extend(data)
    
    # Check if clarification needed
    response_data = {
        "session_id": session_id,
        "processed_data": processed,
        "session_complete": False
    }
    
    if processed.get("clarification_question"):
        # Add app response to conversation
        session["conversation"].append({
            "from": "app",
            "message": processed["clarification_question"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        response_data["clarification_needed"] = True
        response_data["question"] = processed["clarification_question"]
    else:
        # Session might be complete
        response_data["clarification_needed"] = False
        response_data["ready_to_save"] = True
    
    return response_data

@app.post("/input/clarify")
async def clarify_entry(clarification: ClarificationResponse):
    """Handle clarification response"""
    session_id = clarification.session_id
    
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Process clarification
    entry = LogEntry(
        message=clarification.response,
        session_id=session_id
    )
    
    return await log_entry(entry)

@app.post("/input/save_session")
async def save_session(session_data: Dict):
    """Save a completed session"""
    session_id = session_data.get("session_id")
    
    if session_id and session_id in active_sessions:
        session = active_sessions[session_id]
        session["status"] = "completed"
        session["end_time"] = datetime.now(timezone.utc).isoformat()
        
        # Save to file
        file_path = DataManager.save_session(session)
        
        # Remove from active sessions
        del active_sessions[session_id]
        
        return {
            "success": True,
            "session_id": session_id,
            "saved_to": file_path
        }
    
    raise HTTPException(status_code=400, detail="Invalid session")

@app.get("/data/summary")
async def get_data_summary(date: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get daily or date range summary"""
    if date:
        return DataManager.get_daily_data(date)
    elif start_date and end_date:
        return DataManager.get_date_range_data(start_date, end_date)
    else:
        # Default to today
        today = datetime.now().strftime("%Y-%m-%d")
        return DataManager.get_daily_data(today)

@app.get("/timeline/view")
async def get_timeline_data(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get timeline visualization data"""
    if not start_date:
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
    
    data = DataManager.get_date_range_data(start_date, end_date)
    
    # Transform for timeline visualization
    timeline_items = []
    
    for daily_data in data:
        for session in daily_data["sessions"]:
            for category, items in session.get("structured_data", {}).items():
                for item in items:
                    timeline_items.append({
                        "id": f"{session['session_id']}_{category}_{len(timeline_items)}",
                        "content": str(item),
                        "start": session.get("start_time", daily_data["date"]),
                        "group": category,
                        "category": category,
                        "session_id": session["session_id"]
                    })
    
    return {
        "items": timeline_items,
        "groups": [
            {"id": "food", "content": "Food"},
            {"id": "medication", "content": "Medication"},
            {"id": "behavior", "content": "Behavior"},
            {"id": "exercise", "content": "Exercise"},
            {"id": "water", "content": "Water"},
            {"id": "potty", "content": "Potty"},
            {"id": "school", "content": "School"}
        ]
    }

@app.get("/settings")
async def get_settings():
    """Get current settings"""
    if SETTINGS_FILE.exists():
        with open(SETTINGS_FILE, 'r') as f:
            return json.load(f)
    
    # Return defaults
    return {
        "input_mode": "voice",
        "llm_model": "llama2",
        "theme": "light",
        "accessibility": {
            "high_contrast": False,
            "large_text": False,
            "screen_reader": False
        }
    }

@app.post("/settings")
async def update_settings(settings: SettingsConfig):
    """Update settings"""
    settings_dict = settings.dict()
    
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(settings_dict, f, indent=2)
    
    # Update LLM configuration if changed
    if (settings.llm_model != llm_processor.model_name or 
        settings.llm_backend != llm_processor.llm_backend):
        llm_processor.switch_backend(settings.llm_backend, settings.llm_model)
    
    return {"success": True, "settings": settings_dict}

@app.get("/setup/schedule")
async def get_schedule():
    """Get current schedule configuration"""
    if SCHEDULE_FILE.exists():
        with open(SCHEDULE_FILE, 'r') as f:
            return json.load(f)
    
    # Return default schedule
    return {
        "reminders": [
            {"time": "08:00", "type": "breakfast", "enabled": True},
            {"time": "12:00", "type": "lunch", "enabled": True},
            {"time": "18:00", "type": "dinner", "enabled": True},
            {"time": "20:00", "type": "bedtime_routine", "enabled": True}
        ],
        "timezone": "UTC"
    }

@app.post("/setup/schedule")
async def update_schedule(schedule: ScheduleConfig):
    """Update schedule configuration"""
    schedule_dict = schedule.dict()
    
    with open(SCHEDULE_FILE, 'w') as f:
        json.dump(schedule_dict, f, indent=2)
    
    return {"success": True, "schedule": schedule_dict}

@app.get("/llm/status")
async def get_llm_status():
    """Get LLM backend status and configuration"""
    return llm_processor.get_status()

@app.post("/llm/switch")
async def switch_llm_backend(backend: str, model_name: Optional[str] = None):
    """Switch LLM backend and optionally change model"""
    llm_processor.switch_backend(backend, model_name)
    return {
        "success": True,
        "new_status": llm_processor.get_status()
    }

@app.get("/llm/models")
async def get_available_models():
    """Get available models for current backend"""
    if llm_processor.llm_backend == "ollama" and llm_processor.ollama_available:
        try:
            import ollama
            models = ollama.list()
            return {
                "backend": "ollama",
                "models": [model["name"] for model in models.get("models", [])]
            }
        except Exception as e:
            return {"backend": "ollama", "models": [], "error": str(e)}
    
    elif llm_processor.llm_backend == "llamacpp":
        # List available .gguf files in models directory
        models_dir = Path("./models")
        if models_dir.exists():
            gguf_files = [f.stem for f in models_dir.glob("*.gguf")]
            return {
                "backend": "llamacpp", 
                "models": gguf_files
            }
        else:
            return {"backend": "llamacpp", "models": [], "error": "Models directory not found"}
    
    return {"backend": "none", "models": []}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "llm_status": llm_processor.get_status(),
        "active_sessions": len(active_sessions)
    }

# Development server
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='NDK Tracker Backend')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=8080, help='Port to bind to')
    parser.add_argument('--reload', action='store_true', help='Enable auto-reload for development')
    
    args = parser.parse_args()
    
    print(f"Starting NDK Tracker Backend on {args.host}:{args.port}")
    print(f"Local IP: {get_local_ip()}")
    print(f"LLM Available: {llm_processor.ollama_available}")
    
    uvicorn.run(
        "main:app",
        host=args.host,
        port=args.port,
        reload=args.reload
    )