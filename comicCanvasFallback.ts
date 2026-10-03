/**
 * Procedural Comic Art Engine for free offline/fallback comic generation.
 * Renders authentic 2:3 comic book panels with halftones, action lines,
 * speech bubbles, narration boxes, and sound-effect bursts.
 */

import { Beat, ComicFace } from './types';

interface RenderOptions {
  type: ComicFace['type'];
  pageNum: number;
  beat: Beat;
  heroBase64?: string;
  friendBase64?: string;
  genre: string;
  language?: string;
}

export async function generateComicFallbackPanel(options: RenderOptions): Promise<string> {
  const width = 600;
  const height = 900;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const { type, pageNum, beat, heroBase64, friendBase64, genre } = options;

  // 1. Color Palette based on Genre
  let bgGrad1 = '#ffde59';
  let bgGrad2 = '#ff5757';
  let accentColor = '#00f0ff';
  let halftoneColor = 'rgba(0, 0, 0, 0.08)';

  if (genre.includes('Horror')) {
    bgGrad1 = '#2c003e';
    bgGrad2 = '#000000';
    accentColor = '#ff0055';
    halftoneColor = 'rgba(255, 0, 80, 0.1)';
  } else if (genre.includes('Fantasy')) {
    bgGrad1 = '#3a1c71';
    bgGrad2 = '#d76d77';
    accentColor = '#ffaf7b';
  } else if (genre.includes('Noir')) {
    bgGrad1 = '#1a1a24';
    bgGrad2 = '#0d0d11';
    accentColor = '#00ffff';
    halftoneColor = 'rgba(255, 255, 255, 0.05)';
  } else if (genre.includes('Sci-Fi')) {
    bgGrad1 = '#0f2027';
    bgGrad2 = '#203a43';
    accentColor = '#2c5364';
  }

  // Draw background gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, bgGrad1);
  grad.addColorStop(1, bgGrad2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. Action Sunburst / Radial Speed Lines
  ctx.save();
  ctx.translate(width / 2, height * 0.45);
  const rays = 28;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  for (let i = 0; i < rays; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, Math.max(width, height) * 1.2, (i * 2 * Math.PI) / rays, ((i + 0.5) * 2 * Math.PI) / rays);
    ctx.fill();
  }
  ctx.restore();

  // 3. Comic Halftone Dots Simulation
  ctx.fillStyle = halftoneColor;
  const dotSpacing = 18;
  for (let x = 10; x < width - 10; x += dotSpacing) {
    for (let y = 10; y < height - 10; y += dotSpacing) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. Panel Borders (thick inking style)
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(5, 5, width - 10, height - 10);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(12, 12, width - 24, height - 24);

  // 5. Center Illustration Frame / Cutout
  const imgBoxX = 50;
  const imgBoxY = type === 'cover' ? 220 : 160;
  const imgBoxW = 500;
  const imgBoxH = type === 'cover' ? 520 : 440;

  // Background for central frame
  ctx.fillStyle = '#111111';
  ctx.fillRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);

  // Draw Hero Image or Stylized Silhouette
  const imgToDraw = (beat.focus_char === 'friend' && friendBase64) ? friendBase64 : (heroBase64 || friendBase64);
  if (imgToDraw) {
    try {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = imgToDraw.startsWith('data:') ? imgToDraw : `data:image/jpeg;base64,${imgToDraw}`;
      });
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        // Draw image cover style
        const scale = Math.max((imgBoxW - 12) / img.naturalWidth, (imgBoxH - 12) / img.naturalHeight);
        const sW = (imgBoxW - 12) / scale;
        const sH = (imgBoxH - 12) / scale;
        const sx = (img.naturalWidth - sW) / 2;
        const sy = (img.naturalHeight - sH) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(imgBoxX + 6, imgBoxY + 6, imgBoxW - 12, imgBoxH - 12);
        ctx.clip();
        ctx.drawImage(img, sx, sy, sW, sH, imgBoxX + 6, imgBoxY + 6, imgBoxW - 12, imgBoxH - 12);
        ctx.restore();
      } else {
        // Fallback heroic emblem
        drawHeroEmblem(ctx, imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2, accentColor, genre);
      }
    } catch {
      drawHeroEmblem(ctx, imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2, accentColor, genre);
    }
  } else {
    drawHeroEmblem(ctx, imgBoxX + imgBoxW / 2, imgBoxY + imgBoxH / 2, accentColor, genre);
  }

  // 6. Cover vs Back Cover vs Story Panel Graphics
  if (type === 'cover') {
    // Top Banner
    ctx.fillStyle = '#ff0033';
    ctx.fillRect(20, 20, width - 40, 150);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(20, 20, width - 40, 150);

    // Title: INFINITE HEROES
    ctx.font = 'bold 58px "Bangers", "Impact", cursive';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText('INFINITE HEROES', width / 2 + 4, 104);
    ctx.fillStyle = '#ffe600';
    ctx.fillText('INFINITE HEROES', width / 2, 100);

    // Subtitle
    ctx.font = 'bold 22px "Comic Neue", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`COLLECTOR'S SPECIAL • ${genre.toUpperCase()} EDITION`, width / 2, 145);

    // Free Edition Badge in Corner
    drawBadge(ctx, 75, 75, 'FREE!', '#22c55e');

    // Issue #1 Corner Box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(width - 130, 30, 95, 80);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(width - 130, 30, 95, 80);
    ctx.font = 'bold 16px "Bangers", cursive';
    ctx.fillStyle = '#000000';
    ctx.fillText('ISSUE #1', width - 82, 58);
    ctx.font = 'bold 24px "Bangers", cursive';
    ctx.fillStyle = '#dc2626';
    ctx.fillText('FREE', width - 82, 85);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#555';
    ctx.fillText('ALL AGES', width - 82, 102);

    // Dramatic Action Stamp
    drawSoundFX(ctx, width - 110, 680, 'POW!', '#ff0055');

  } else if (type === 'back_cover') {
    // Teaser Banner
    ctx.fillStyle = '#000000';
    ctx.fillRect(30, 50, width - 60, 110);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffe600';
    ctx.strokeRect(30, 50, width - 60, 110);

    ctx.font = 'bold 44px "Bangers", cursive';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe600';
    ctx.fillText('TO BE CONTINUED...', width / 2, 120);

    // Teaser description box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(40, 630, width - 80, 120);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(40, 630, width - 80, 120);

    ctx.font = 'bold 20px "Comic Neue", sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText('THE MULTIVERSE HAS EXPANDED!', width / 2, 675);
    ctx.font = '16px "Comic Neue", sans-serif';
    ctx.fillStyle = '#333333';
    ctx.fillText('Save your comic or launch a brand new adventure anytime.', width / 2, 710);

    drawBadge(ctx, width / 2, 810, '100% FREE ISSUE', '#3b82f6', 160, 45);

  } else {
    // STORY PAGE
    // Page Number Corner Tag
    ctx.fillStyle = '#000000';
    ctx.fillRect(25, 25, 120, 36);
    ctx.font = 'bold 18px "Bangers", cursive';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe600';
    ctx.fillText(`PAGE ${pageNum}`, 85, 50);

    // Sound effect burst on alternating pages
    if (pageNum % 2 === 1) {
      const fxWords = ['BAM!', 'CRUNCH!', 'ZOOM!', 'WHOOSH!', 'ZAP!'];
      const chosenFx = fxWords[pageNum % fxWords.length];
      drawSoundFX(ctx, width - 100, 220, chosenFx, '#ff0033');
    }

    // Narration Box (Top)
    const captionText = beat.caption || `Chapter ${pageNum}: The story surges forward in dramatic fashion!`;
    drawNarrationBox(ctx, 35, 75, width - 70, captionText);

    // Dialogue Speech Balloon (Bottom)
    if (beat.dialogue) {
      drawSpeechBubble(ctx, 50, 620, width - 100, 120, beat.dialogue);
    }
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

function drawHeroEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, genre: string) {
  ctx.save();
  ctx.translate(cx, cy);

  // Glowing burst
  const radial = ctx.createRadialGradient(0, 0, 10, 0, 0, 160);
  radial.addColorStop(0, color);
  radial.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = radial;
  ctx.beginPath();
  ctx.arc(0, 0, 160, 0, Math.PI * 2);
  ctx.fill();

  // Shield badge
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(0, -90);
  ctx.lineTo(80, -40);
  ctx.lineTo(70, 50);
  ctx.lineTo(0, 100);
  ctx.lineTo(-70, 50);
  ctx.lineTo(-80, -40);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ffd700';
  ctx.stroke();

  // Hero Star / Lightning
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(0, -60);
  ctx.lineTo(15, -15);
  ctx.lineTo(60, -10);
  ctx.lineTo(25, 20);
  ctx.lineTo(35, 65);
  ctx.lineTo(0, 35);
  ctx.lineTo(-35, 65);
  ctx.lineTo(-25, 20);
  ctx.lineTo(-60, -10);
  ctx.lineTo(-15, -15);
  ctx.closePath();
  ctx.fill();

  ctx.font = 'bold 22px "Bangers", cursive';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(genre.toUpperCase(), 0, 140);
  ctx.restore();
}

function drawNarrationBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, text: string) {
  ctx.save();
  ctx.fillStyle = '#fef08a'; // Comic yellow caption box
  ctx.fillRect(x, y, w, 75);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(x, y, w, 75);

  ctx.font = 'italic bold 17px "Comic Neue", sans-serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';

  // Simple text wrapping
  wrapText(ctx, text, x + 15, y + 30, w - 30, 22);
  ctx.restore();
}

function drawSpeechBubble(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string) {
  ctx.save();
  // White comic speech bubble with pointer tail
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 20);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000000';
  ctx.stroke();

  // Pointer Tail
  ctx.beginPath();
  ctx.moveTo(x + 50, y + h);
  ctx.lineTo(x + 20, y + h + 30);
  ctx.lineTo(x + 80, y + h);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 18px "Comic Neue", sans-serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  wrapText(ctx, `"${text}"`, x + 20, y + 38, w - 40, 24);
  ctx.restore();
}

function drawSoundFX(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.15);

  // Starburst
  ctx.fillStyle = color;
  ctx.beginPath();
  const points = 12;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? 65 : 35;
    const angle = (i * Math.PI) / points;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000000';
  ctx.stroke();

  ctx.font = 'bold 28px "Bangers", cursive';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 0, 10);
  ctx.restore();
}

function drawBadge(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, bg: string, w = 80, h = 40) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = bg;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.font = 'bold 18px "Bangers", cursive';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 0, 7);
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
      if (curY > y + lineHeight * 2) {
        // truncate to avoid overflow
        ctx.fillText(line.trim() + '...', x, curY);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, curY);
}
