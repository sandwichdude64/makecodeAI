// DOM elements
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const outputBox = document.getElementById("output");
const grid = document.getElementById("pixelGrid");
const tokenInput = document.getElementById("hfTokenInput");

// A strict,  verified 19x19 grid template (19 rows, each exactly 19 characters wide)
const TEMPLATE = `img\`
...................
...................
...................
.....fffffff.......
...ff.......ff.....
...f..f...f..f.....
...f..f...f..f.....
...f..f...f..f.....
...f.........f.....
...f...fff...f.....
...ff.......ff.....
....fffffffff......
...f.........f.....
..ff.........ff....
..ff.........ff....
.f..f.......f..f...
.f..fffffffff..f...
..ff.f.f.f.f.ff....
....ffff.ffff......
\``;

// FIXED: Extract grid even if wrapped in markdown code blocks
function parseMakeCodeImage(text) {
  if (!text) return Array(19).fill(null).map(() => Array(19).fill(null));
  
  // Strip markdown code blocks if present
  let cleanedText = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
  const lines = cleanedText.split("\n");
  
  const gridLines = lines.filter(line => {
    const clean = line.trim();
    return clean.length === 19 && /^[.0-9a-fA-F]+$/.test(clean);
  });

  if (gridLines.length === 0) {
    return Array(19).fill(null).map(() => Array(19).fill(null));
  }

  return gridLines.map(line => 
    line.trim().split("").map(c => (c === "." ? null : c))
  );
}

// FIXED: Call the actual Hugging Face Inference API
// FIXED: Call the actual Hugging Face Inference API via the correct Chat endpoint and CORS proxy
async function askAI(userPrompt) {
  const userKey = tokenInput.value.trim();
  if (!userKey) {
    return "Error: Please paste your Hugging Face Token (hf_...) into the top box first.";
  }

  const fullPrompt = `You are an AI assistant that ONLY edits and returns MakeCode img\`\` templates. You must stay safe, friendly, and appropriate. You must NEVER change the overall grid size. You must ONLY fill the space by replacing dots with valid MakeCode color values (0–9, a–f). You must NEVER add extra commentary text, notes, markdown blocks, or structural explanations outside the code block. The user wants this sprite to look like: ${userPrompt} Fill in this template configuration exactly: ${TEMPLATE}`;

  // 1. Target the correct Hugging Face standard OpenAI-compatible completions path
  const targetApiUrl = "https://huggingface.co";
  
  // 2. Wrap it cleanly with your CORS proxy
  const proxyUrl = `https://corsproxy.io{encodeURIComponent(targetApiUrl)}`;

  try {
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userKey}` // Transmits token through the proxy
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-Coder-0.5B-Instruct", 
        messages: [
          { "role": "user", "content": fullPrompt } 
        ],
        max_tokens: 512 
      })
    });

    // Check if the response failed before reading payload text
    if (!response.ok) {
      const errorText = await response.text();
      return `API Error (${response.status}): ${errorText}`;
    }

    const data = await response.json();

    // 3. Extract completion content string reliably
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      return "Error: Unexpected response format from model.\n\nRaw: " + JSON.stringify(data);
    }
    
  } catch (err) {
    return `Network Error: ${err.message}`;
  }
}


// Main execution process bound to event interactions
async function generateSprite() {
  const prompt = input.value.trim();
  if (!prompt) return;

  // Toggle processing state UI elements
  outputBox.textContent = "Processing sprite request via Qwen 0.5B AI...";
  input.disabled = true;
  sendBtn.disabled = true;

  const aiText = await askAI(prompt);
  outputBox.textContent = aiText;

  const pixelData = parseMakeCodeImage(aiText);
  renderGrid(pixelData);

  // Reset control bindings
  input.disabled = false;
  sendBtn.disabled = false;
  input.focus();
}

// Bind events to the UI
sendBtn.addEventListener("click", generateSprite);
input.addEventListener("keydown", (event) => {
  if (event.key === 'Enter') {
    generateSprite();
  }
});

// Initialize template view container placeholder when loading page
renderGrid(parseMakeCodeImage(TEMPLATE));
