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

// 2. Base Utility Functions first
function makeCodeColor(char) {
  const palette = {
    ".": "transparent", "1": "#FFFFFF", "2": "#FF2121", "3": "#FF93C4",
    "4": "#FF8135", "5": "#FFF609", "6": "#249CA3", "7": "#78DC52",
    "8": "#003FAD", "9": "#87F2FF", "a": "#8E2EC4", "b": "#A4839F",
    "c": "#5C406C", "d": "#E5CDC4", "e": "#91463D", "f": "#000000"
  };
  return palette[char.toLowerCase()] || "transparent";
}

function parseMakeCodeImage(text) {
  if (!text) return Array(19).fill(null).map(() => Array(19).fill(null));
  let cleanedText = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
  const lines = cleanedText.split("\n");
  const gridLines = lines.filter(line => {
    const clean = line.trim();
    return clean.length === 19 && /^[.0-9a-fA-F]+$/.test(clean);
  });
  if (gridLines.length === 0) {
    return Array(19).fill(null).map(() => Array(19).fill(null));
  }
  return gridLines.map(line => line.trim().split("").map(c => (c === "." ? null : c)));
}

// 3. The UI Renderer
function renderGrid(pixelData) {
  const grid = document.getElementById("pixelGrid");
  grid.innerHTML = "";
  pixelData.forEach(row => {
    row.forEach(cell => {
      const div = document.createElement("div");
      div.className = "pixel";
      if (cell !== null) {
        div.style.backgroundColor = makeCodeColor(cell);
      }
      grid.appendChild(div);
    });
  });
}

// 4. API Request Handler (Direct call without proxy)
async function askAI(userPrompt) {
  const tokenInput = document.getElementById("hfTokenInput");
  const userKey = tokenInput.value.trim();
  if (!userKey) {
    return "Error: Please paste your Hugging Face Token (hf_...) into the top box first.";
  }

  const fullPrompt = `You are an AI assistant that ONLY edits and returns MakeCode img\`\` templates. You must stay safe, friendly, and appropriate. You must NEVER change the overall grid size. You must return ONLY the img\`\` block with no other text. Grid size: 19x19 chars. Available colors: . (blank), 1-9, a-f. User request: ${userPrompt}`;

  const apiUrl = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-0.5B-Instruct";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userKey}`
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          return_full_text: false,
          max_new_tokens: 512
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `API Error (${response.status}): ${errorText}`;
    }

    const data = await response.json();
    if (Array.isArray(data) && data[0] && data[0].generated_text) {
      return data[0].generated_text;
    } else if (data.generated_text) {
      return data.generated_text;
    } else {
      return "Error: Unexpected response format from model.";
    }
  } catch (err) {
    return `Network Error: ${err.message}`;
  }
}

// 5. Main Execution Flow
async function generateSprite() {
  const input = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const outputBox = document.getElementById("output");

  const prompt = input.value.trim();
  if (!prompt) return;

  outputBox.textContent = "Processing sprite request via Qwen 0.5B AI...";
  input.disabled = true;
  sendBtn.disabled = true;

  const aiText = await askAI(prompt);
  outputBox.textContent = aiText;
  
  const pixelData = parseMakeCodeImage(aiText);
  renderGrid(pixelData);

  input.disabled = false;
  sendBtn.disabled = false;
  input.focus();
}

// 6. Initialize everything when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Get references to DOM elements
  const input = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");

  // Attach event listeners
  sendBtn.addEventListener("click", generateSprite);
  input.addEventListener("keydown", (event) => {
    if (event.key === 'Enter') {
      generateSprite();
    }
  });

  // Show initial template
  renderGrid(parseMakeCodeImage(TEMPLATE));
});
