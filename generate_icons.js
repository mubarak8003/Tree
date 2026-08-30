import sharp from "sharp";
import fs from "fs";
import path from "path";

const publicDir = path.join(process.cwd(), "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// SVG matching the exact FTP purple logo uploaded by user
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#5200FF"/>
  
  <!-- Centered FTP text -->
  <text 
    x="256" 
    y="320" 
    text-anchor="middle" 
    fill="#FFFFFF" 
    font-family="system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" 
    font-weight="900" 
    font-size="205" 
    letter-spacing="2"
  >FTP</text>
  
  <!-- Trending Arrow Line under FTP -->
  <g stroke="#FFFFFF" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <!-- Path: start bottom-left, up to peak, down to trough, up-right to arrow tip -->
    <path d="M 138 412 L 208 342 L 254 408 L 322 350" />
    <!-- Arrowhead at top-right tip -->
    <path d="M 305 348 L 322 350 L 320 372" fill="none"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, "icon.svg"), svgContent);

async function generatePNGs() {
  const svgBuffer = Buffer.from(svgContent);

  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, "icon-192.png"));

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, "icon-512.png"));

  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));

  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, "favicon.png"));

  console.log("Successfully generated all PWA icons in /public!");
}

generatePNGs().catch(console.error);
