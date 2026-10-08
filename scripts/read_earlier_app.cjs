const fs = require('fs');
const readline = require('readline');
const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/rohit/.gemini/antigravity/brain/46dc6c05-fe07-44a2-808d-c5d7d27574a8/.system_generated/logs/transcript_full.jsonl')
});
rl.on('line', (line) => {
  if (line.includes('"name":"write_to_file"') && line.includes('app.js')) {
    const obj = JSON.parse(line);
    console.log('Found write_to_file app.js at step:', obj.step_index);
    if (obj.tool_calls && obj.tool_calls[0] && obj.tool_calls[0].args) {
      console.log('Args keys:', Object.keys(obj.tool_calls[0].args));
      const code = obj.tool_calls[0].args.CodeContent || '';
      console.log('Code length:', code.length, 'preview:', code.substring(0, 150));
      fs.writeFileSync(`scripts/app_backup_step_${obj.step_index}.js`, code);
    }
  }
});
