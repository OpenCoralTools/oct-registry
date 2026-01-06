import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';

const DATA_DIR = path.join(process.cwd(), 'data');
const OUTPUT_DIR = path.join(process.cwd(), 'public/downloads');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const registers = ['organizations', 'species', 'genets'];

registers.forEach(register => {
  const jsonPath = path.join(DATA_DIR, `${register}.json`);
  const csvPath = path.join(OUTPUT_DIR, `${register}.csv`);

  if (fs.existsSync(jsonPath)) {
    try {
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      
      if (jsonData.length > 0) {
        const parser = new Parser();
        const csv = parser.parse(jsonData);
        fs.writeFileSync(csvPath, csv);
        console.log(`Converted ${register}.json to ${register}.csv`);
      } else {
        console.log(`Skipping ${register}.json - empty data`);
      }
    } catch (error) {
      console.error(`Error converting ${register}.json:`, error);
      process.exit(1);
    }
  } else {
    console.warn(`File not found: ${jsonPath}`);
  }
});

