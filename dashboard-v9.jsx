function ai(prompt) {
    const response = fetch('http://localhost:11434/api/execute', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'qwen3:1.7b',
            prompt: prompt,
        }),
    });
    return response.json();
}

function aiJSON(prompt) {
    return ai(prompt);
}