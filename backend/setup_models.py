#!/usr/bin/env python3
"""
Script to download and set up GGUF models for llama.cpp integration
"""

import os
import requests
from pathlib import Path
import argparse

# Popular GGUF model URLs (these are examples - replace with actual URLs)
MODEL_URLS = {
    "llama2-7b": {
        "url": "https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf",
        "filename": "llama-2-7b-chat.Q4_K_M.gguf"
    },
    "mistral-7b": {
        "url": "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf", 
        "filename": "mistral-7b-instruct-v0.2.Q4_K_M.gguf"
    },
    "codellama-7b": {
        "url": "https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.Q4_K_M.gguf",
        "filename": "codellama-7b-instruct.Q4_K_M.gguf"
    }
}

def download_model(model_name: str, models_dir: Path):
    """Download a GGUF model"""
    if model_name not in MODEL_URLS:
        print(f"Unknown model: {model_name}")
        print(f"Available models: {list(MODEL_URLS.keys())}")
        return False
    
    model_info = MODEL_URLS[model_name]
    url = model_info["url"]
    filename = model_info["filename"]
    filepath = models_dir / filename
    
    if filepath.exists():
        print(f"Model {filename} already exists")
        return True
    
    print(f"Downloading {model_name} from {url}")
    print(f"This may take a while (models are several GB)...")
    
    try:
        # Create models directory
        models_dir.mkdir(exist_ok=True)
        
        # Download with progress
        response = requests.get(url, stream=True)
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
        
        print(f"\nDownloaded {filename} successfully")
        return True
        
    except Exception as e:
        print(f"Error downloading {model_name}: {e}")
        if filepath.exists():
            filepath.unlink()  # Remove incomplete file
        return False

def list_models(models_dir: Path):
    """List available GGUF models"""
    if not models_dir.exists():
        print("Models directory does not exist")
        return
    
    gguf_files = list(models_dir.glob("*.gguf"))
    if gguf_files:
        print("Available GGUF models:")
        for model_file in gguf_files:
            size_mb = model_file.stat().st_size / (1024 * 1024)
            print(f"  - {model_file.name} ({size_mb:.1f} MB)")
    else:
        print("No GGUF models found")

def main():
    parser = argparse.ArgumentParser(description="Download and manage GGUF models")
    parser.add_argument("--download", choices=list(MODEL_URLS.keys()), 
                       help="Download a specific model")
    parser.add_argument("--list", action="store_true", 
                       help="List available models")
    parser.add_argument("--models-dir", default="./models", 
                       help="Models directory (default: ./models)")
    
    args = parser.parse_args()
    
    models_dir = Path(args.models_dir)
    
    if args.list:
        list_models(models_dir)
    elif args.download:
        download_model(args.download, models_dir)
    else:
        print("Available models for download:")
        for name, info in MODEL_URLS.items():
            print(f"  - {name}: {info['filename']}")
        print("\nUsage examples:")
        print(f"  python setup_models.py --download llama2-7b")
        print(f"  python setup_models.py --list")
        print(f"  python setup_models.py --models-dir /path/to/models --download mistral-7b")

if __name__ == "__main__":
    main()