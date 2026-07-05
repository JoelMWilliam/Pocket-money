import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const svg = readFileSync(join(rootDir, 'public', 'favicon.svg'))

async function generateIcons() {
  const sizes = [192, 512]
  for (const size of sizes) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(join(rootDir, 'public', `icon-${size}.png`))
    console.log(`Generated icon-${size}.png`)
  }

  await sharp(svg)
    .resize(180, 180)
    .png()
    .toFile(join(rootDir, 'public', 'apple-touch-icon.png'))
  console.log('Generated apple-touch-icon.png')
}

generateIcons().catch(console.error)
