/**
 * Generates /public/vanta-wordmark-email.png from the VANTA wordmark SVG.
 * Run once: node scripts/gen-wordmark-png.mjs
 */
import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "../public/vanta-wordmark-email.png");

// 2× scale for retina clarity in email clients (renders at width="140" in HTML)
const SCALE = 3;
const W = 404 * SCALE;
const H = 72 * SCALE;
const S = 9 * SCALE; // stroke-width scaled

const svg = `<svg xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${404 * SCALE} ${72 * SCALE}"
  width="${W}" height="${H}">

  <rect width="${W}" height="${H}" fill="white"/>

  <g fill="none"
     stroke-width="${S}"
     stroke-linecap="round"
     stroke-linejoin="round"
     transform="scale(${SCALE})">

    <!-- V -->
    <polyline points="20,14 50,58 80,14" stroke="#1C1C1C"/>
    <!-- First ∧ (violet) -->
    <polyline points="96,58 126,14 156,58" stroke="#A78BFA"/>
    <!-- N -->
    <polyline points="172,58 172,14 232,58 232,14" stroke="#1C1C1C"/>
    <!-- T crossbar -->
    <line x1="248" y1="14" x2="308" y2="14" stroke="#1C1C1C"/>
    <!-- T stem -->
    <line x1="278" y1="14" x2="278" y2="58" stroke="#1C1C1C"/>
    <!-- Second ∧ (violet) -->
    <polyline points="324,58 354,14 384,58" stroke="#A78BFA"/>
  </g>
</svg>`;

await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile(outPath);

console.log(`✓ Written: ${outPath} (${W}×${H}px @${SCALE}×)`);
