#!/usr/bin/env python3
"""
Minimal setup script for Autism Tracker
Combines model download and backend startup in one executable
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path
import requests
import time

# Minimal model - smaller GGUF for easier distribution
MINIMAL_MODEL = {
    "url": "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
    "filename": "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
}

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

def start_backend(models_dir: Path):
    """Start the backend server"""
    print("Starting Autism Tracker backend...")

    # Set environment variable for model path
    env = os.environ.copy()
    env['LLAMA_CPP_MODEL_PATH'] = str(models_dir / MINIMAL_MODEL["filename"])

    try:
        # Import and run the backend
        sys.path.insert(0, os.path.dirname(__file__))
        from main import app
        import uvicorn

        print("Backend started successfully!")
        print("Access the API at: http://localhost:8000")
        print("Press Ctrl+C to stop")

        uvicorn.run(app, host="0.0.0.0", port=8000)

    except ImportError as e:
        print(f"Error importing backend: {e}")
        print("Make sure all dependencies are installed")
        return False
    except Exception as e:
        print(f"Error starting backend: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Minimal Autism Tracker Setup")
    parser.add_argument("--models-dir", type=str, default="./models",
                       help="Directory to store models")
    parser.add_argument("--skip-download", action="store_true",
                       help="Skip model download if already exists")

    args = parser.parse_args()

    models_dir = Path(args.models_dir).absolute()

    print("=== Autism Tracker Minimal Setup ===")
    print(f"Models directory: {models_dir}")

    # Download model if needed
    if not args.skip_download:
        if not download_minimal_model(models_dir):
            print("Failed to download model")
            return 1

    # Start backend
    start_backend(models_dir)

    return 0

if __name__ == "__main__":
    sys.exit(main())