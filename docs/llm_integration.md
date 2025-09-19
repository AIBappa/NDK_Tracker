# LLM Integration Guide

The Autism Tracker backend supports two LLM backends for processing natural language input:

## 1. Ollama Integration (Default)

**Ollama** provides easy access to various LLM models with a simple API.

### Setup
1. **Install Ollama**: Download from https://ollama.ai
2. **Pull models**: `ollama pull llama2`
3. **Start Ollama**: Usually starts automatically as a service
4. **Backend will auto-detect**: No additional configuration needed

### Available Models via Ollama
- `llama2` - Meta's Llama 2 (7B, 13B, 70B variants)
- `llama3` - Meta's Llama 3 (8B, 70B variants)  
- `mistral` - Mistral 7B
- `codellama` - Code Llama for programming tasks
- `gemma` - Google's Gemma models
- `phi3` - Microsoft's Phi-3 models

### Advantages
- Easy installation and management
- Automatic updates
- GPU acceleration support
- Multiple model formats
- Built-in model serving

## 2. llama.cpp Integration

**llama.cpp** provides direct access to GGUF quantized models with lower memory usage.

### Setup
1. **Install llama-cpp-python**: 
   ```bash
   pip install llama-cpp-python
   ```

2. **Download GGUF models**: 
   ```bash
   python setup_models.py --download llama2-7b
   ```

3. **Create models directory**:
   ```
   backend/
   └── models/
       ├── llama-2-7b-chat.Q4_K_M.gguf
       ├── mistral-7b-instruct-v0.2.Q4_K_M.gguf
       └── codellama-7b-instruct.Q4_K_M.gguf
   ```

### Model Quantization Levels
- **Q4_K_M**: Balanced quality/size (recommended)
- **Q2_K**: Smallest size, lower quality
- **Q5_K_M**: Higher quality, larger size
- **Q8_0**: Highest quality, largest size

### Advantages
- Lower memory usage via quantization
- No separate service required
- Direct model access
- Faster startup time
- Better for resource-constrained devices

## Backend Selection

### Runtime Configuration

The backend can be configured at runtime via API:

```python
# Check available backends
GET /llm/status

# Switch to Ollama
POST /llm/switch?backend=ollama&model_name=llama2

# Switch to llama.cpp  
POST /llm/switch?backend=llamacpp&model_name=llama2-7b

# List available models
GET /llm/models
```

### Settings Configuration

Include in settings JSON:
```json
{
  "llm_backend": "ollama",
  "llm_model": "llama2",
  "input_mode": "voice"
}
```

### Automatic Fallback

The system automatically selects the best available backend:
1. Prefers the configured backend if available
2. Falls back to any available LLM backend
3. Uses keyword-based processing if no LLM available

## Model Selection Guidelines

### For Development
- **Ollama + llama2**: Easiest setup, good performance
- **llama.cpp + Q4_K_M**: Lower resource usage

### For Production
- **Ollama + mistral**: Good balance of speed/quality
- **llama.cpp + Q5_K_M**: Higher quality responses

### For Resource-Constrained Systems
- **llama.cpp + Q2_K**: Minimal memory usage
- **Keyword fallback**: No LLM required

## Performance Considerations

### Memory Usage
- **Ollama**: ~4-8GB RAM for 7B models
- **llama.cpp Q4_K_M**: ~3-5GB RAM for 7B models
- **llama.cpp Q2_K**: ~2-3GB RAM for 7B models

### CPU vs GPU
- **CPU-only**: Works on any system, slower inference
- **GPU acceleration**: Requires CUDA/Metal, much faster

### Response Time
- **Ollama**: ~2-5 seconds for responses
- **llama.cpp**: ~1-3 seconds for responses
- **Keyword fallback**: Instant

## Troubleshooting

### Ollama Issues
```bash
# Check Ollama status
ollama ps

# Restart Ollama service
ollama serve

# List installed models
ollama list
```

### llama.cpp Issues
```bash
# Check available models
python setup_models.py --list

# Verify model file integrity
ls -la models/*.gguf

# Test model loading
python -c "from llama_cpp import Llama; Llama('./models/llama-2-7b-chat.Q4_K_M.gguf')"
```

### Common Problems

1. **Out of Memory**: Use smaller models or higher quantization
2. **Slow Performance**: Enable GPU acceleration if available
3. **Model Not Found**: Check file paths and permissions
4. **Connection Failed**: Verify Ollama service is running

## Example Usage

### Basic Processing
```python
# Initialize with Ollama
llm = LLMProcessor(model_name="llama2", llm_backend="ollama")

# Process input
result = llm.process_input("She had pasta for lunch at 1pm")

# Switch to llama.cpp
llm.switch_backend("llamacpp", "llama2-7b")
```

### Advanced Configuration
```python
# Check status
status = llm.get_status()
print(f"Backend: {status['current_backend']}")
print(f"Model: {status['current_model']}")
print(f"Available: {status['available_backends']}")

# Get available models
if status['current_backend'] == 'ollama':
    models = ollama.list()
elif status['current_backend'] == 'llamacpp':
    models = list(Path('./models').glob('*.gguf'))
```

## Integration with Frontend

The frontend settings screen allows users to:
1. View available LLM backends
2. Switch between Ollama and llama.cpp
3. Select different models
4. Test LLM functionality
5. View performance metrics

This provides a complete local LLM solution with flexibility for different deployment scenarios.