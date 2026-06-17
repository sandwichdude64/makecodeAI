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
async function askAI(userPrompt) {
  const userKey = tokenInput.value.trim();
  if (!userKey) {
    return "Error: Please paste your Hugging Face Token (hf_...) into the top box first.";
  }

  const fullPrompt = `You are an AI assistant that ONLY edits and returns MakeCode img\`\` templates. You must stay safe, friendly, and appropriate. You must NEVER change the overall grid size. You must ONLY fill the space by replacing dots with valid MakeCode color values (0–9, a–f). You must NEVER add extra commentary text, notes, markdown blocks, or structural explanations outside the code block. The user wants this sprite to look like: ${userPrompt} Fill in this template configuration exactly: ${TEMPLATE}`;

  try {
    // FIXED: Use the actual serverless inference API endpoint
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-Coder-0.5B-Instruct", 
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userKey}`
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            return_full_text: false, // Don't echo the prompt back
            max_new_tokens: 512      // Keep response short and fast
          }
        })
      }
    );

    // FIXED: Always read body, even on HTTP errors, so we can inspect them
    const data = await response.json();

    if (response.ok) {
      // Serverless API returns: [ { generated_text: "..." } ]
      if (Array.isArray(data) && data[0] && data[0].generated_text) {
        return data[0].generated_text;
      } else if (data.generated_text) {
        return data.generated_text;
      } else {
        return "Error: Unexpected response format from model.\n\nRaw: " + JSON.stringify(data);
      }
    } else {
      return `API Error (${response.status}): ${data.error || JSON.stringify(data)}`;
    }
  } catch (err) {
    return `Network Error: ${err.message}`;
  }
}

// Convert MakeCode color strings into hex values
function makeCodeColor(char) {
  const palette = {
    ".": "transparent",
    "1": "#FFFFFF", // white
    "2": "#FF2121", // red
    "3": "#FF93C4", // pink
    "4": "#FF8135", // orange
    "5": "#FFF609", // yellow
    "6": "#249CA3", // teal
    "7": "#78DC52", // green
    "8": "#003FAD", // dark blue
    "9": "#87F2FF", // light blue
    "a": "#8E2EC4", // purple
    "b": "#A4839F", // grayish purple
    "c": "#5C406C", // dark purple
    "d": "#E5CDC4", // beige / skin
    "e": "#91463D", // brown
    "f": "#000000" // black
  };
  return palette[char.toLowerCase()] || "transparent";
}

// Render our matrix payload into visual DOM nodes
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
