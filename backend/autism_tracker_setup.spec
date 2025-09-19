# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for autism_tracker_setup with llama-cpp-python support
"""

import sys
import os
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, os.path.abspath('.'))

block_cipher = None

# Find llama-cpp-python installation path to include DLLs
def find_llama_cpp_binaries():
    """Find llama-cpp-python binary files"""
    try:
        import llama_cpp
        llama_cpp_path = Path(llama_cpp.__file__).parent
        
        # Look for DLL and shared library files
        dll_files = []
        for pattern in ['*.dll', '*.so', '*.dylib', '*.pyd']:
            dll_files.extend(llama_cpp_path.rglob(pattern))
        
        # Return as (source, destination) tuples
        binaries = []
        for dll_file in dll_files:
            # Place in llama_cpp directory within the bundle
            binaries.append((str(dll_file), 'llama_cpp'))
        
        print(f"Found llama-cpp binaries: {len(binaries)} files")
        return binaries
    except Exception as e:
        print(f"Could not find llama-cpp binaries: {e}")
        return []

# Get llama-cpp binaries
llama_cpp_binaries = find_llama_cpp_binaries()

a = Analysis(
    ['minimal_setup.py'],
    pathex=[],
    binaries=llama_cpp_binaries,
    datas=[],
    hiddenimports=[
        'main',
        'llama_cpp',
        'llama_cpp.llama_cpp',
        'llama_cpp.llama',
        'uvicorn',
        'ollama',
        'fastapi',
        'pydantic',
        'requests'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='autism_tracker_setup_v2',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
