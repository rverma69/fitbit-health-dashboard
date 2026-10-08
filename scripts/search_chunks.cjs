const fs = require('fs');
const path = require('path');
const readline = require('readline');

const chunkDir = 'C:/Users/rohit/.gemini/antigravity/brain/46dc6c05-fe07-44a2-808d-c5d7d27574a8/.system_generated/logs/chunks/transcript_full';
const files = fs.readdirSync(chunkDir);

async function search() {
  for (const f of files) {
    const rl = readline.createInterface({
      input: fs.createReadStream(path.join(chunkDir, f))
    });
    for await (const line of rl) {
      if (line.includes('app.js') && (line.includes('replace_file_content') || line.includes('view_file'))) {
        const obj = JSON.parse(line);
        console.log(`In chunk ${f}, step ${obj.step_index}: tool=${obj.tool_name || (obj.tool_calls && obj.tool_calls[0] && obj.tool_calls[0].name)}`);
      }
    }
  }
}
search();
