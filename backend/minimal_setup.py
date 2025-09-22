#!/usr/bin/env python3
"""
Minimal setup script for NDK Tracker
Combines model download and backend startup in        logging.info(\"Backend imported successfully!\")
        
        # Test model initialization before starting server
        try:
            logging.info(\"Testing model initialization...\")
            # This will trigger the backend to initialize the LLM
            response = app.state if hasattr(app, 'state') else None
            logging.info(\"Model initialization test completed\")
        except Exception as e:
            logging.warning(f\"Model initialization test failed: {e}\")
            # Continue anyway, might work when server starts
        
        print(\"Backend started successfully!\")
        print(\"Access the API at: http://localhost:8000\")
        print(\"Press Ctrl+C to stop\")
        print(f\"Logs are saved to: {log_file}\")
        
        # Add a small delay to let everything initialize
        time.sleep(2)

        uvicorn.run(app, host=\"0.0.0.0\", port=8000)ecutable
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path
from typing import Optional
import requests
import time
import logging
import traceback

# Minimal model - smaller GGUF for easier distribution
MINIMAL_MODEL = {
    "url": "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
    "filename": "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
}

def find_existing_model(models_dir: Path) -> Optional[Path]:
    """Search for an existing GGUF model in common locations.
    Preference: models next to the executable (for packaged app), then provided models_dir,
    then CWD/models, then any .gguf in CWD. Avoid backend script directory when frozen to
    prevent scattering models in source folders.
    """
    candidates: list[Path] = []
    try:
        # Executable directory (PyInstaller onefile) / models has highest priority when frozen
        if getattr(sys, 'frozen', False):
            exe_dir = Path(sys.executable).parent
            candidates.append(exe_dir / 'models')
        # Primary requested directory (defaults to ./models relative to CWD)
        candidates.append(models_dir)
        # Current working dir / models
        candidates.append(Path.cwd() / 'models')
        # Only include script directory when not frozen (development runs)
        if not getattr(sys, 'frozen', False):
            candidates.append(Path(__file__).resolve().parent / 'models')
        # Current working dir (flat)
        candidates.append(Path.cwd())
    except Exception:
        pass

    logging.info("Model search paths (in order):")
    for p in candidates:
        logging.info(f" - {p}")

    # First, try exact filename in any candidate dir
    for base in candidates:
        try:
            if base and base.exists():
                target = base / MINIMAL_MODEL["filename"]
                if target.exists():
                    logging.info(f"Found existing model: {target}")
                    return target
        except Exception:
            continue

    # Fallback: any .gguf in candidates (first one)
    for base in candidates:
        try:
            if base and base.exists():
                matches = list(base.glob('*.gguf'))
                if matches:
                    logging.info(f"Found alternative model: {matches[0]}")
                    return matches[0]
        except Exception:
            continue

    logging.info("No existing model found in candidate paths.")
    return None

def download_minimal_model(models_dir: Path):
    """Download minimal model for testing"""
    models_dir.mkdir(exist_ok=True)
    filepath = models_dir / MINIMAL_MODEL["filename"]

    if filepath.exists():
        print(f"Model already exists: {filepath}")
        return True

    print("Downloading minimal model (this may take a few minutes)...")

    try:
        response = requests.get(MINIMAL_MODEL["url"], stream=True)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0

        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        progress = (downloaded / total_size) * 100
                        print(f"\rProgress: {progress:.1f}%", end='', flush=True)

        print(f"\nDownloaded {MINIMAL_MODEL['filename']} successfully")
        return True

    except Exception as e:
        print(f"Error downloading model: {e}")
        return False

def setup_logging(models_dir: Path):
    """Setup logging to capture errors"""
    log_file = models_dir / "NDK_tracker.log"
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return log_file

def check_ollama_available():
    """Check if Ollama is running"""
    try:
        import ollama
        ollama.list()
        return True
    except Exception as e:
        logging.info(f"Ollama not available: {e}")
        return False

def start_backend(models_dir: Path):
    """Start the backend server"""
    print("Starting NDK Tracker backend...")
    
    # Setup logging
    log_file = setup_logging(models_dir)
    logging.info(f"Log file: {log_file}")

    # Determine model path to use
    env = os.environ.copy()
    pre_set = env.get('LLAMA_CPP_MODEL_PATH')
    if pre_set and Path(pre_set).exists():
        model_path = Path(pre_set)
        logging.info(f"Using pre-set LLAMA_CPP_MODEL_PATH: {model_path}")
    else:
        existing = find_existing_model(models_dir)
        if existing and existing.exists():
            model_path = existing
        else:
            model_path = models_dir / MINIMAL_MODEL["filename"]
        env['LLAMA_CPP_MODEL_PATH'] = str(model_path)
    logging.info(f"Final model path: {env.get('LLAMA_CPP_MODEL_PATH')}")
    
    # Force llama-cpp backend since we're using a GGUF model
    env['DEFAULT_LLM_BACKEND'] = 'llamacpp'
    # Update current process environment so backend can read these
    os.environ['DEFAULT_LLM_BACKEND'] = env['DEFAULT_LLM_BACKEND']
    if 'LLAMA_CPP_MODEL_PATH' in env:
        os.environ['LLAMA_CPP_MODEL_PATH'] = env['LLAMA_CPP_MODEL_PATH']
    
    # Check Ollama availability
    ollama_available = check_ollama_available()
    if not ollama_available:
        logging.info("Ollama not detected - using llama-cpp backend with downloaded model")
    else:
        logging.info("Ollama detected but using llama-cpp for this setup")

    try:
        # Import and run the backend
        # In PyInstaller onefile, avoid manipulating sys.path; rely on bundled modules.
        # Ensure 'main' is included at build time (use --hidden-import=main when building if needed).
        try:
            logging.info("Importing main module...")
            from main import app  # type: ignore
        except ModuleNotFoundError as e:
            # Fallback for frozen apps: try dynamic import
            logging.info(f"Direct import failed: {e}, trying dynamic import...")
            import importlib
            app = importlib.import_module("main").app  # type: ignore[attr-defined]

        import uvicorn

        logging.info("Backend imported successfully!")
        print("Backend started successfully!")
        print("Access the API at: http://localhost:8000")
        print("Press Ctrl+C to stop")
        print(f"Logs are saved to: {log_file}")

        uvicorn.run(app, host="0.0.0.0", port=8000)

    except ImportError as e:
        error_msg = f"Error importing backend: {e}"
        logging.error(error_msg)
        logging.error(traceback.format_exc())
        print(error_msg)
        print("Make sure all dependencies are installed")
        input("Press Enter to continue...")
        return False
    except Exception as e:
        error_msg = f"Error starting backend: {e}"
        logging.error(error_msg)
        logging.error(traceback.format_exc())
        print(error_msg)
        print(f"Full error details saved to: {log_file}")
        input("Press Enter to continue...")
        return False

def main():
    parser = argparse.ArgumentParser(description="Minimal NDK Tracker Setup")
    parser.add_argument("--models-dir", type=str, default="./models",
                       help="Directory to store models")
    parser.add_argument("--skip-download", action="store_true",
                       help="Skip model download if already exists")

    args = parser.parse_args()

    models_dir = Path(args.models_dir).absolute()

    print("=== NDK Tracker Minimal Setup ===")
    print(f"Models directory: {models_dir}")

    # If a model already exists in common paths, skip download.
    existing_model = find_existing_model(models_dir)
    if existing_model:
        print(f"Using existing model at: {existing_model}")
    else:
        # Download model if needed (unless explicitly skipped)
        if not args.skip_download:
            if not download_minimal_model(models_dir):
                print("Failed to download model")
                return 1
        else:
            print("--skip-download provided and no model found; backend may fail to start without a model.")

    # Start backend
    start_backend(models_dir)

    return 0

if __name__ == "__main__":
    sys.exit(main())