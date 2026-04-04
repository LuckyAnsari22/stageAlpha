const https = require('https');
const fs = require('fs');

https.get('https://hiphopera.au/', (res) => {
  let data = '';
  res.on('data', (c) => data += c);
  res.on('end', () => {
    // Extract everything inside <style>
    const styles = data.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    // Extract <link rel="stylesheet"> attributes
    const links = data.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) || [];
    // Dump to file
    fs.writeFileSync('hiphopera_styles.txt', 
      "=== LINKS ===\n" + links.join('\n') + 
      "\n\n=== STYLES ===\n" + styles.map(s => s.substring(0, 1000)).join('\n\n')
    );
    console.log('Saved hiphopera_styles.txt');
  });
}).on('error', (e) => {
  console.error(e);
});
