const fs = require('fs');
const readline = require('readline');
const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/rohit/.gemini/antigravity/brain/46dc6c05-fe07-44a2-808d-c5d7d27574a8/.system_generated/logs/transcript_full.jsonl')
});
let count = 0;
rl.on('line', (line) => {
  if (line.includes('prevDateBtn') && (line.includes('app.js') || line.includes('function') || line.includes('addEventListener'))) {
    count++;
    const obj = JSON.parse(line);
    console.log(`Step ${obj.step_index}: type=${obj.type}, tool=${obj.tool_name || ''}`);
    const str = line.substring(0, 300);
    console.log('preview:', str);
    if (obj.tool_calls) {
      obj.tool_calls.forEach(tc => {
        console.log(' tool call name:', tc.name);
        if (tc.name === 'write_to_file' || tc.name === 'replace_file_content') {
          console.log(' Target:', tc.args.TargetFile);
          if (tc.args.TargetFile && tc.args.TargetFile.includes('app.js')) {
            console.log(' Found app.js edit at step', obj.step_index);
            fs.writeFileSync(`scripts/found_step_${obj.step_index}.txt`, JSON.stringify(tc.args));
          }
        }
      });
    }
  }
});
rl.on('close', () => {
  console.log('Total matches:', count);
});
