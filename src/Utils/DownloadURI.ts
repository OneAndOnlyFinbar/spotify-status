import fetch from 'node-fetch';
import * as fs from 'fs';

export function downloadURI(url: string, path: string): Promise<void> {
  return new Promise((resolve) => {
    fetch(url).then(res => {
      if(!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
      const dest = fs.createWriteStream(path);
      res.body.pipe(dest);
      res.body.on('end', () => {
        resolve();
      });
    });
  });
}