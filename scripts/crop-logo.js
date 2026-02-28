import sharp from "sharp";

const input = "/vercel/share/v0-project/public/images/hover-ninja-logo.png";
const output = "/vercel/share/v0-project/public/images/hover-ninja-logo.png";

async function cropLogo() {
  const image = sharp(input);
  const { width, height } = await image.metadata();

  // Trim transparent whitespace, then add a small 4px padding back
  const trimmed = await image.trim().toBuffer({ resolveWithObject: true });

  console.log(`Original: ${width}x${height}`);
  console.log(`Trimmed: ${trimmed.info.width}x${trimmed.info.height}`);

  // Add just a tiny bit of bottom padding to preserve the shadow
  await sharp(trimmed.data)
    .extend({
      top: 4,
      bottom: 8,
      left: 4,
      right: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(output);

  console.log("Cropped logo saved!");
}

cropLogo();
