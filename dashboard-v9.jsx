// Assuming the rest of the file remains unchanged

// New ai function using Ollama with qwen3:1.7b model at localhost:11434
function ai(input) {
    const response = fetch('http://localhost:11434', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: 'qwen3:1.7b', prompt: input })
    });
    return response.json();
}

// New aiJSON function using Ollama with qwen3:1.7b model at localhost:11434
function aiJSON(input) {
    const response = fetch('http://localhost:11434', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: 'qwen3:1.7b', prompt: input })
    });
    return response.json();
}