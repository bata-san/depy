import * as THREE from 'three';

type Painter = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const cache = new Map<string, THREE.CanvasTexture>();

function texture(key: string, width: number, height: number, painter: Painter): THREE.CanvasTexture {
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable');
  painter(ctx, width, height);
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  result.magFilter = THREE.NearestFilter;
  result.minFilter = THREE.NearestMipmapNearestFilter;
  result.generateMipmaps = true;
  cache.set(key, result);
  return result;
}

const hex = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

export function floorTexture(): THREE.CanvasTexture {
  return texture('office-floor-v2', 256, 192, (ctx, width, height) => {
    ctx.fillStyle = '#1b2732';
    ctx.fillRect(0, 0, width, height);
    const columns = 16;
    const rows = 12;
    const cellW = width / columns;
    const cellH = height / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        ctx.fillStyle = (row + column) % 2 ? '#2d3d4b' : '#344757';
        ctx.fillRect(column * cellW + 1, row * cellH + 1, cellW - 2, cellH - 2);
        ctx.fillStyle = 'rgba(255,255,255,.035)';
        ctx.fillRect(column * cellW + 2, row * cellH + 2, cellW - 4, 2);
      }
    }
    ctx.strokeStyle = '#14202a';
    ctx.lineWidth = 3;
    for (const x of [3, 6, 9, 12]) {
      ctx.beginPath();
      ctx.moveTo(x * cellW, 0);
      ctx.lineTo(x * cellW, height);
      ctx.stroke();
    }
  });
}

export function keyboardTexture(accent: number): THREE.CanvasTexture {
  return texture(`keyboard-${accent}`, 128, 52, (ctx, width, height) => {
    ctx.fillStyle = '#15202a';
    ctx.fillRect(0, 0, width, height);
    const keyW = 9;
    const keyH = 10;
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 11; column += 1) {
        ctx.fillStyle = '#40515d';
        ctx.fillRect(5 + column * 11, 4 + row * 13, keyW, keyH);
        ctx.fillStyle = '#566a78';
        ctx.fillRect(6 + column * 11, 5 + row * 13, keyW - 2, 2);
      }
    }
    ctx.fillStyle = hex(accent);
    ctx.fillRect(42, 43, 44, 5);
  });
}

export function fanTexture(accent: number): THREE.CanvasTexture {
  return texture(`fan-${accent}`, 128, 128, (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    for (let blade = 0; blade < 9; blade += 1) {
      ctx.save();
      ctx.rotate(blade / 9 * Math.PI * 2);
      ctx.fillStyle = '#2a3945';
      ctx.beginPath();
      ctx.moveTo(6, -8);
      ctx.quadraticCurveTo(29, -23, 48, -5);
      ctx.lineTo(19, 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = hex(accent);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 51, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#111a22';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

export function cityWindowTexture(): THREE.CanvasTexture {
  return texture('city-window-grid-v2', 64, 128, (ctx, width, height) => {
    ctx.fillStyle = '#0d1721';
    ctx.fillRect(0, 0, width, height);
    for (let y = 5; y < height - 4; y += 11) {
      for (let x = 5; x < width - 4; x += 10) {
        const lit = ((x * 13 + y * 7) % 29) > 8;
        ctx.fillStyle = lit ? (((x + y) % 3) ? '#ffd08a' : '#8dd3ff') : '#182735';
        ctx.fillRect(x, y, 5, 6);
      }
    }
  });
}
