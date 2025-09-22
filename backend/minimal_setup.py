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
import re
import argparse
from pathlib import Path
from typing import Optional
import requests
import time
import logging
import traceback
import ipaddress
import socket
from concurrent.futures import ThreadPoolExecutor
import qrcode

from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from datetime import datetime, timedelta

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

        # Prepare HTTPS certificate (Local CA -> issue server cert)
        certs_dir = models_dir / "certs"
        certs_dir.mkdir(parents=True, exist_ok=True)
        # Expose models dir to the app so routes can locate the CA
        try:
            os.environ["NDK_MODELS_DIR"] = str(models_dir)
        except Exception:
            pass

        def get_local_ip() -> str:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                ip = s.getsockname()[0]
                s.close()
                return ip
            except Exception:
                return "127.0.0.1"

        def get_lan_ip() -> str:
            # Try socket method first
            ip = get_local_ip()
            if ip and not ip.startswith("127."):
                return ip
            # Windows fallback: parse ipconfig
            try:
                if sys.platform.startswith('win'):
                    proc = subprocess.run(["ipconfig"], capture_output=True, text=True, check=False)
                    output = proc.stdout
                    # Prefer typical private ranges
                    for pattern in [r"IPv4 Address[\.\s]*:\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)",
                                    r"inet\s+([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)"]:
                        for m in re.finditer(pattern, output):
                            cand = m.group(1)
                            if cand.startswith(("192.168.", "10.", "172.16.", "172.17.", "172.18.", "172.19.",
                                                "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.",
                                                "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.")):
                                return cand
            except Exception:
                pass
            return ip

        def ensure_local_ca(certs_dir: Path) -> tuple[Path, Path]:
            ca_key = certs_dir / "ndk_local_ca.key"
            ca_crt = certs_dir / "ndk_local_ca.crt"
            if ca_key.exists() and ca_crt.exists():
                return ca_key, ca_crt
            try:
                logging.info("Generating local CA (one-time)...")
                key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
                subject = issuer = x509.Name([
                    x509.NameAttribute(NameOID.COUNTRY_NAME, u"US"),
                    x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"NDK Tracker Local CA"),
                    x509.NameAttribute(NameOID.COMMON_NAME, u"NDK Local CA"),
                ])
                ca_cert = (
                    x509.CertificateBuilder()
                    .subject_name(subject)
                    .issuer_name(issuer)
                    .public_key(key.public_key())
                    .serial_number(x509.random_serial_number())
                    .not_valid_before(datetime.utcnow() - timedelta(minutes=1))
                    .not_valid_after(datetime.utcnow() + timedelta(days=3650))
                    .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
                    .sign(key, hashes.SHA256())
                )
                with open(ca_key, "wb") as f:
                    f.write(key.private_bytes(
                        encoding=serialization.Encoding.PEM,
                        format=serialization.PrivateFormat.TraditionalOpenSSL,
                        encryption_algorithm=serialization.NoEncryption(),
                    ))
                with open(ca_crt, "wb") as f:
                    f.write(ca_cert.public_bytes(serialization.Encoding.PEM))
                logging.info(f"Local CA created at {ca_crt}")
                return ca_key, ca_crt
            except Exception:
                logging.error("Failed to create local CA:")
                logging.error(traceback.format_exc())
                raise

        def issue_server_cert(certs_dir: Path, ca_key_path: Path, ca_crt_path: Path, ip_addrs: list[str]) -> tuple[Path, Path]:
            key_file = certs_dir / "server.key"
            cert_file = certs_dir / "server.crt"
            # Load CA
            with open(ca_key_path, "rb") as f:
                ca_key = serialization.load_pem_private_key(f.read(), password=None)
            with open(ca_crt_path, "rb") as f:
                ca_cert = x509.load_pem_x509_certificate(f.read())

            # Build SANs
            alt_names = [x509.DNSName(u"localhost")]
            for ip in ip_addrs:
                try:
                    alt_names.append(x509.IPAddress(ipaddress.ip_address(ip)))
                except Exception:
                    pass
            san = x509.SubjectAlternativeName(alt_names)

            # Generate server key & cert
            key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
            subject = x509.Name([
                x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"NDK Tracker"),
                x509.NameAttribute(NameOID.COMMON_NAME, u"NDK Local Server"),
            ])
            cert = (
                x509.CertificateBuilder()
                .subject_name(subject)
                .issuer_name(ca_cert.subject)
                .public_key(key.public_key())
                .serial_number(x509.random_serial_number())
                .not_valid_before(datetime.utcnow() - timedelta(minutes=1))
                .not_valid_after(datetime.utcnow() + timedelta(days=825))
                .add_extension(san, critical=False)
                .sign(ca_key, hashes.SHA256())
            )
            with open(key_file, "wb") as f:
                f.write(key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.TraditionalOpenSSL,
                    encryption_algorithm=serialization.NoEncryption(),
                ))
            with open(cert_file, "wb") as f:
                f.write(cert.public_bytes(serialization.Encoding.PEM))
            logging.info(f"Issued server cert at {cert_file}")
            return cert_file, key_file

        # Determine IPs and ensure certs
        local_ip = get_lan_ip()
        ca_key_path, ca_crt_path = ensure_local_ca(certs_dir)
        ip_list = ["127.0.0.1"]
        if local_ip and local_ip != "127.0.0.1":
            ip_list.append(local_ip)
        cert_file, key_file = issue_server_cert(certs_dir, ca_key_path, ca_crt_path, ip_list)

        print("Backend started successfully!")
        print(f"Access the API at: http://{local_ip}:8000 (HTTP)")
        print(f"Also available at: https://{local_ip}:8443 (HTTPS, trusted after installing local CA)")
        pairing_url = f"https://{local_ip}:8443/pair"
        print(f"Pairing page:     {pairing_url}")
        print(f"Trust the local CA once on your phone: https://{local_ip}:8443/cert/ca")
        # Print QR in console for quick mobile scan
        try:
            qr = qrcode.QRCode(border=1)
            qr.add_data(pairing_url)
            qr.make(fit=True)
            print("\nScan this QR to open pairing (HTTPS):")
            # Invert for dark terminals; fallback to default if not supported
            try:
                qr.print_ascii(invert=True)
            except Exception:
                qr.print_ascii()
            print("")
        except Exception as e:
            logging.info(f"Console QR printing skipped: {e}")
        # Copy pairing URL to clipboard on Windows for convenience
        try:
            if sys.platform.startswith('win'):
                subprocess.run(['clip'], input=pairing_url, text=True, check=False)
                print("(Pairing URL copied to clipboard)")
        except Exception as e:
            logging.info(f"Clipboard copy skipped: {e}")
        print("Press Ctrl+C to stop")
        print(f"Logs are saved to: {log_file}")

        # Run HTTP and HTTPS servers in parallel
        def run_http():
            uvicorn.run(
                app,
                host="0.0.0.0",
                port=8000,
                log_level="warning",
                access_log=False,
            )

        def run_https():
            uvicorn.run(
                app,
                host="0.0.0.0",
                port=8443,
                ssl_certfile=str(cert_file),
                ssl_keyfile=str(key_file),
                log_level="warning",
                access_log=False,
            )

        with ThreadPoolExecutor(max_workers=2) as pool:
            pool.submit(run_http)
            run_https()

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