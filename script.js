// DOM elements
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const outputBox = document.getElementById("output");
const grid = document.getElementById("pixelGrid");

// HuggingFace API key
const HF_KEY = "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";

// Your 19x19 template (you can replace this with any template)
const TEMPLATE = `
img\`
2457698a3db1cef..
.................
.................
.....fffffff.....
...ff.......ff...
...f..f...f..f...
...f..f...f..f...
...f..f...f..f...
...f.........f...
...f...fff...f...
...ff.......ff...
....fffffffff....
...f.........f...
..ff.........ff..
..ff.........ff..
.f..f.......f..f.
.f..fffffffff..f.
..ff.f.f.f.f.ff..
....ffff.ffff....
....f..f.f..f....
\`
`;

// Send request to HuggingFace
async function askAI(userPrompt) {
    const fullPrompt = `
You are an AI that ONLY fills in MakeCode img\`\` templates.
You must stay safe, friendly, and appropriate.
You must NEVER change the grid size.
You must ONLY replace characters with MakeCode color values (0–9, a–f) or dots.
You must NEVER add extra characters or lines.
You must NEVER output anything except the img\`\` block.

The user wants this sprite to look like: ${userPrompt}

Fill in this template:

${TEMPLATE}
`;

    const response = await fetch(
        "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-1.5B",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${HF_KEY}`
            },
            body: JSON.stringify({ inputs: fullPrompt })
        }
    );

    const data = await response.json();
    return data[0].generated_text;
}

// Parse MakeCode img`` into a 2D array
function parseMakeCodeImage(text) {
    const lines = text
        .split("\n")
        .filter(l => l.includes(".") || l.match(/[0-9a-f]/));

    return lines.map(line =>
        line.trim().split("").map(c => (c === "." ? null : c))
    );
}

// Convert MakeCode color numbers to real colors
function makeCodeColor(char) {
    const palette = {
        ".": "transparent",   // transparent
        "1": "#FFFFFF",       // white
        "2": "#FF2121",       // red
        "3": "#FF93C4",       // pink
        "4": "#FF8135",       // orange
        "5": "#FFF609",       // yellow
        "6": "#249CA3",       // teal
        "7": "#78DC52",       // green
        "8": "#003FAD",       // dark blue
        "9": "#87F2FF",       // light blue
        "a": "#8E2EC4",       // purple
        "b": "#A4839F",       // grayish purple
        "c": "#5C406C",       // dark purple
        "d": "#E5CDC4",       // beige / skin
        "e": "#91463D",       // brown
        "f": "#000000"        // black
    };
    return palette[char] || "transparent";
}


// Render the pixel grid
function renderGrid(pixelData) {
    grid.innerHTML = "";
    grid.style.gridTemplateColumns = `repeat(${pixelData[0].length}, 1fr)`;

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

// When user clicks Generate
sendBtn.addEventListener("click", async () => {
    const prompt = input.value;
    outputBox.textContent = "Thinking…";

    const aiText = await askAI(prompt);
    outputBox.textContent = aiText;

    const pixelData = parseMakeCodeImage(aiText);
    renderGrid(pixelData);
});
