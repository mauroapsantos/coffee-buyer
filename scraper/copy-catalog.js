const fs = require('fs/promises');
const path = require('path');

async function main() {
  const source = path.join(__dirname, '..', 'data', 'catalog.json');
  const target = path.join(__dirname, '..', 'app', 'src', 'data', 'catalog.json');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
  console.log(`Copied catalog to ${target}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
