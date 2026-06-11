const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'icono.png');
const destDir = path.join(__dirname, 'src', 'assets', 'icons');

if (!fs.existsSync(srcPath)) {
  console.error('Source icon not found at:', srcPath);
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });

const iconBuffer = fs.readFileSync(srcPath);

const sizes = [72, 192, 512];
sizes.forEach(size => {
  const destPath = path.join(destDir, `icon-${size}x${size}.png`);
  fs.writeFileSync(destPath, iconBuffer);
  console.log(`Copied icon to: ${destPath}`);
});
