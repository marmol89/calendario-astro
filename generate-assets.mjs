import sharp from "sharp";
import { writeFileSync } from "fs";

const INDIGO = "#6366f1";
const WHITE = "#ffffff";
const DARK_TEXT = "#1e293b";

// ── App Icon 512x512 ───────────────────────────────────
async function generateIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <rect width="512" height="512" rx="100" fill="${INDIGO}"/>
      <g transform="translate(156, 120) scale(3.5)">
        <rect x="6" y="10" width="36" height="34" rx="4" fill="${WHITE}" stroke="#818cf8" stroke-width="2"/>
        <rect x="6" y="10" width="36" height="10" rx="4" fill="${INDIGO}"/>
        <rect x="6" y="16" width="36" height="4" fill="${INDIGO}"/>
        <circle cx="14" cy="6" r="2.5" fill="#a5b4fc"/>
        <circle cx="34" cy="6" r="2.5" fill="#a5b4fc"/>
        <path d="M18 29l4 4 8-10" stroke="${WHITE}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="12" y1="34" x2="18" y2="34" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-linecap="round"/>
        <line x1="12" y1="38" x2="22" y2="38" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-linecap="round"/>
        <line x1="26" y1="34" x2="30" y2="34" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-linecap="round"/>
        <line x1="32" y1="34" x2="36" y2="34" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-linecap="round"/>
      </g>
    </svg>`;

  await sharp(Buffer.from(svg)).png().toFile("./icons/playstore-icon.png");
  console.log("✅ playstore-icon.png (512x512)");
}

// ── Feature Graphic 1024x500 ───────────────────────────
async function generateFeatureGraphic() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#4f46e5"/>
          <stop offset="100%" stop-color="#818cf8"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="500" fill="url(#bg)"/>
      <!-- Logo -->
      <g transform="translate(120, 80) scale(2.5)">
        <rect x="6" y="10" width="36" height="34" rx="4" fill="${WHITE}" stroke="#c7d2fe" stroke-width="2"/>
        <rect x="6" y="10" width="36" height="10" rx="4" fill="#4f46e5"/>
        <rect x="6" y="16" width="36" height="4" fill="#4f46e5"/>
        <circle cx="14" cy="6" r="2.5" fill="#a5b4fc"/>
        <circle cx="34" cy="6" r="2.5" fill="#a5b4fc"/>
        <path d="M18 29l4 4 8-10" stroke="${WHITE}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="12" y1="34" x2="18" y2="34" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-linecap="round"/>
        <line x1="12" y1="38" x2="22" y2="38" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-linecap="round"/>
        <line x1="26" y1="34" x2="30" y2="34" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-linecap="round"/>
        <line x1="32" y1="34" x2="36" y2="34" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-linecap="round"/>
      </g>
      <!-- Text -->
      <text x="360" y="210" fill="${WHITE}" font-family="Inter, sans-serif" font-size="52" font-weight="700">Calendario de Tareas</text>
      <text x="360" y="270" fill="rgba(255,255,255,0.85)" font-family="Inter, sans-serif" font-size="22">Organiza tu día con etiquetas, prioridades y recordatorios</text>
      <!-- Feature tags -->
      <g transform="translate(360, 310)">
        <rect x="0" y="0" width="120" height="32" rx="16" fill="rgba(255,255,255,0.15)"/>
        <text x="60" y="22" fill="${WHITE}" font-family="sans-serif" font-size="13" text-anchor="middle" font-weight="500">📅 3 vistas</text>
        <rect x="132" y="0" width="120" height="32" rx="16" fill="rgba(255,255,255,0.15)"/>
        <text x="192" y="22" fill="${WHITE}" font-family="sans-serif" font-size="13" text-anchor="middle" font-weight="500">🏷️ Etiquetas</text>
        <rect x="264" y="0" width="140" height="32" rx="16" fill="rgba(255,255,255,0.15)"/>
        <text x="334" y="22" fill="${WHITE}" font-family="sans-serif" font-size="13" text-anchor="middle" font-weight="500">🔔 Recordatorios</text>
        <rect x="0" y="42" width="140" height="32" rx="16" fill="rgba(255,255,255,0.15)"/>
        <text x="70" y="64" fill="${WHITE}" font-family="sans-serif" font-size="13" text-anchor="middle" font-weight="500">☁️ Sincronización</text>
        <rect x="152" y="42" width="140" height="32" rx="16" fill="rgba(255,255,255,0.15)"/>
        <text x="222" y="64" fill="${WHITE}" font-family="sans-serif" font-size="13" text-anchor="middle" font-weight="500">↩️ Deshacer</text>
        <rect x="304" y="42" width="140" height="32" rx="16" fill="rgba(255,255,255,0.15)"/>
        <text x="374" y="64" fill="${WHITE}" font-family="sans-serif" font-size="13" text-anchor="middle" font-weight="500">🌙 Modo oscuro</text>
      </g>
    </svg>`;

  await sharp(Buffer.from(svg)).png().toFile("./icons/playstore-feature.png");
  console.log("✅ playstore-feature.png (1024x500)");
}

generateIcon().catch(console.error);
generateFeatureGraphic().catch(console.error);
