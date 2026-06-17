// 1. DOM Elements at the top
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const outputBox = document.getElementById("output");
const grid = document.getElementById("pixelGrid");
const tokenInput = document.getElementById("hfTokenInput");

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

// 3. The UI Renderer (Must be declared before generateSprite calls it!)
function renderGrid(pixelData) {
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

// 4. API Request Handler
async function askAI(userPrompt) {
  const userKey = tokenInput.value.trim();
  if (!userKey) {
    return "Error: Please paste your Hugging Face Token (hf_...) into the top box first.";
  }

  const fullPrompt = `You are an AI assistant that ONLY edits and returns MakeCode img\`\` templates. You must stay safe, friendly, and appropriate. You must NEVER change the overall grid size. You must ONLY fill the space by replacing dots with valid MakeCode color values (0–9, a–f). You must NEVER add extra commentary text, notes, markdown blocks, or structural explanations outside the code block. The user wants this sprite to look like: ${userPrompt} Fill in this template configuration exactly: ${TEMPLATE}`;

  const targetApiUrl = "https://huggingface.co";
  const proxyUrl = `https://corsproxy.io{encodeURIComponent(targetApiUrl)}`; // FIXED URL SYNTAX

  try {
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userKey}`
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-Coder-0.5B-Instruct", 
        messages: [{ "role": "user", "content": fullPrompt }],
        max_tokens: 512 
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `API Error (${response.status}): ${errorText}`;
    }

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      return "Error: Unexpected response format from model.";
    }
  } catch (err) {
    return `Network Error: ${err.message}`;
  }
}

// 5. Main Execution Flow
async function generateSprite() {
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

// 6. Interaction Event Listeners
sendBtn.addEventListener("click", generateSprite);
input.addEventListener("keydown", (event) => {
  if (event.key === 'Enter') {
    generateSprite();
  }
});

// 7. Initial Run to show template
renderGrid(parseMakeCodeImage(TEMPLATE));
