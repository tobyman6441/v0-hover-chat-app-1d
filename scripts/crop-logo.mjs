import sharp from "sharp";

const input = "./public/images/hover-ninja-logo.png";
const output = "./public/images/hover-ninja-logo.png";

// Trim transparent whitespace around the image
const trimmed = await sharp(input).trim().toBuffer();

// Get the trimmed image metadata
const meta = await sharp(trimmed).metadata();
console.log(`Trimmed size: ${meta.width}x${meta.height}`);

// Add a small bottom padding (8px) so the shadow isn't cut off
await sharp(trimmed)
  .extend({
    top: 0,
    bottom: 8,
    left: 0,
    right: 0,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .toFile(output);

console.log("Cropped logo saved.");
