import { getPack } from '../../core/i18n';
import { SKY } from './config';
import type { Box, Cloud, Particle, SkyState } from './types';

interface ScreenPoint {
  x: number;
  y: number;
  scale: number;
}

export interface SkyRenderer {
  resize(): void;
  draw(state: SkyState): void;
  /** Where a world point appears on screen (used to place sparks and floating numbers). */
  project(state: SkyState, x: number, y: number, z: number): ScreenPoint;
}

// Corner order of each cube face, so the faces can be painted back to front.
const CUBE_FACES: {
  corners: [number, number, number, number];
  shade: 'front' | 'back' | 'side' | 'top' | 'bottom';
}[] = [
  { corners: [0, 1, 3, 2], shade: 'front' },
  { corners: [5, 4, 6, 7], shade: 'back' },
  { corners: [4, 0, 2, 6], shade: 'side' },
  { corners: [1, 5, 7, 3], shade: 'side' },
  { corners: [2, 3, 7, 6], shade: 'top' },
  { corners: [0, 1, 5, 4], shade: 'bottom' },
];
const SHADE_LIGHTNESS = { front: 60, back: 45, side: 48, top: 72, bottom: 36 } as const;

export function createSkyRenderer(canvas: HTMLCanvasElement): SkyRenderer {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not supported');
  const ctx: CanvasRenderingContext2D = context;

  let width = 0;
  let height = 0;
  let focalLength = 1;
  let skyGradient: CanvasGradient | null = null;

  function resize(): void {
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    focalLength = Math.min(width * 0.636, height * 1.09);
    skyGradient = ctx.createLinearGradient(0, 0, 0, height);
    skyGradient.addColorStop(0, '#3d9bff');
    skyGradient.addColorStop(0.6, '#8fd3ff');
    skyGradient.addColorStop(1, '#d9f2ff');
  }

  function project(state: SkyState, x: number, y: number, z: number): ScreenPoint {
    const scale = focalLength / z;
    return {
      x: width / 2 + (x - state.camera.x) * scale,
      y: height / 2 - (y - state.camera.y) * scale,
      scale,
    };
  }

  function drawBackground(state: SkyState): void {
    ctx.fillStyle = skyGradient ?? '#8fd3ff';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fff6a8';
    ctx.beginPath();
    ctx.arc(
      width * 0.8 - state.camera.x * 8,
      height * 0.22 - state.camera.y * 8,
      Math.min(width, height) * 0.08,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  function drawCloud(state: SkyState, cloud: Cloud): void {
    const fade = Math.min(1, (cloud.z - 1.5) / 8);
    if (fade <= 0) return;
    const center = project(state, cloud.x, cloud.y, cloud.z);
    const radius = cloud.size * center.scale * 0.5;
    ctx.globalAlpha = fade * 0.9;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    const puffs: [number, number, number][] = [
      [0, 0, 1],
      [-0.9, 0.25, 0.75],
      [0.9, 0.2, 0.8],
      [0.35, -0.45, 0.7],
      [-0.4, -0.4, 0.6],
    ];
    for (const [dx, dy, puffScale] of puffs) {
      const puffX = center.x + dx * radius;
      const puffY = center.y + dy * radius;
      ctx.moveTo(puffX + radius * puffScale, puffY);
      ctx.arc(puffX, puffY, radius * puffScale, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function letterLabel(letterKey: string): string {
    return getPack().letters.find((letter) => letter.key === letterKey)?.boxText ?? letterKey;
  }

  function drawBox(state: SkyState, box: Box): void {
    const half = SKY.BOX_HALF_SIZE;
    const cosYaw = Math.cos(box.yaw);
    const sinYaw = Math.sin(box.yaw);
    const bob =
      box.phase === 'hovering' ? Math.sin(state.elapsedSeconds * 2 + box.bobPhase) * 0.12 : 0;
    const shake =
      box.shakeSeconds > 0
        ? (Math.random() - 0.5) * 0.35 * (box.shakeSeconds / SKY.BOX_SHAKE_SECONDS)
        : 0;
    const centerX = box.x + shake;
    const centerY = box.y + bob;

    const corners: ScreenPoint[] = [];
    const depths: number[] = [];
    for (let corner = 0; corner < 8; corner++) {
      const dx = (corner & 1 ? 1 : -1) * half;
      const dy = (corner & 2 ? 1 : -1) * half;
      const dz = (corner & 4 ? 1 : -1) * half;
      const depth = box.z - dx * sinYaw + dz * cosYaw;
      depths.push(depth);
      corners.push(project(state, centerX + dx * cosYaw + dz * sinYaw, centerY + dy, depth));
    }

    const facesBackToFront = CUBE_FACES.map((face) => ({
      face,
      depth: face.corners.reduce((sum, corner) => sum + (depths[corner] ?? 0), 0) / 4,
    })).sort((a, b) => b.depth - a.depth);

    const flash = box.shakeSeconds > 0.12;
    for (const { face } of facesBackToFront) {
      const points = face.corners.map((corner) => corners[corner] as ScreenPoint);
      ctx.beginPath();
      points.forEach((point, index) =>
        index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y),
      );
      ctx.closePath();
      const lightness = face.shade === 'front' && flash ? 80 : SHADE_LIGHTNESS[face.shade];
      ctx.fillStyle = `hsl(${box.hue},88%,${lightness}%)`;
      ctx.fill();
      ctx.lineWidth = Math.max(2, (corners[0]?.scale ?? 40) * 0.05);
      ctx.strokeStyle = `hsl(${box.hue},70%,25%)`;
      ctx.stroke();
      if (face.shade === 'front') drawFaceLetter(points, box.letterKey);
    }
    drawPunchDots(state, box, centerX, centerY);
  }

  function drawFaceLetter(points: ScreenPoint[], letterKey: string): void {
    const [bottomLeft, bottomRight, topRight, topLeft] = points as [
      ScreenPoint,
      ScreenPoint,
      ScreenPoint,
      ScreenPoint,
    ];
    const middleX = (bottomLeft.x + bottomRight.x + topRight.x + topLeft.x) / 4;
    const middleY = (bottomLeft.y + bottomRight.y + topRight.y + topLeft.y) / 4;
    const fontSize =
      ((Math.abs(bottomRight.x - bottomLeft.x) + Math.abs(topRight.y - bottomRight.y)) / 2) * 0.85;
    const label = letterLabel(letterKey);
    ctx.font = `900 ${fontSize}px "Arial Hebrew",Arial,system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = fontSize * 0.1;
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.strokeText(label, middleX, middleY + fontSize * 0.04);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, middleX, middleY + fontSize * 0.04);
  }

  function drawPunchDots(state: SkyState, box: Box, centerX: number, centerY: number): void {
    for (let dot = 0; dot < SKY.PUNCHES_PER_BOX; dot++) {
      const offsetX = (dot - (SKY.PUNCHES_PER_BOX - 1) / 2) * 0.55;
      const point = project(state, centerX + offsetX, centerY + SKY.BOX_HALF_SIZE + 0.45, box.z);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 0.18 * point.scale, 0, Math.PI * 2);
      ctx.fillStyle = dot < SKY.PUNCHES_PER_BOX - box.punchesTaken ? '#2ecc71' : 'rgba(0,0,0,.35)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }
  }

  function drawGlove(state: SkyState, hasTarget: boolean): void {
    const center = project(state, state.player.x, state.player.y, SKY.PUNCH_PLANE_Z);
    const punchProgress =
      state.punchAnimation > 0
        ? Math.sin(Math.PI * (1 - state.punchAnimation / SKY.PUNCH_ANIMATION_SECONDS))
        : 0;
    ctx.lineWidth = 5;
    ctx.strokeStyle = hasTarget ? '#2ecc71' : 'rgba(255,255,255,.9)';
    ctx.setLineDash(hasTarget ? [] : [10, 8]);
    ctx.beginPath();
    ctx.arc(center.x, center.y, 1.05 * center.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    const gloveSize = 1.3 * center.scale * (1 + 0.55 * punchProgress);
    ctx.font = `${gloveSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🥊', center.x, center.y + gloveSize * 0.05);
  }

  function drawParticle(particle: Particle): void {
    if (particle.kind === 'text') {
      ctx.globalAlpha = Math.max(0, particle.lifeSeconds);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#1b4fa0';
      ctx.fillStyle = '#fff';
      ctx.font = '900 56px system-ui';
      ctx.strokeText(particle.mainText, particle.x, particle.y);
      ctx.fillText(particle.mainText, particle.x, particle.y);
      ctx.font = '800 24px system-ui';
      ctx.strokeText(particle.subText, particle.x, particle.y + 40);
      ctx.fillText(particle.subText, particle.x, particle.y + 40);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.globalAlpha = Math.max(0, Math.min(1, particle.lifeSeconds * 2));
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    ctx.globalAlpha = 1;
  }

  function draw(state: SkyState): void {
    drawBackground(state);
    const sceneObjects: { z: number; paint: () => void }[] = [
      ...state.clouds.map((cloud) => ({ z: cloud.z, paint: () => drawCloud(state, cloud) })),
      ...state.boxes.map((box) => ({ z: box.z, paint: () => drawBox(state, box) })),
    ];
    sceneObjects.sort((a, b) => b.z - a.z).forEach((object) => object.paint());
    state.particles.forEach(drawParticle);
  }

  return {
    resize,
    project,
    draw(state: SkyState): void {
      draw(state);
      if (state.phase === 'counting' || state.phase === 'finished') return;
      const target = state.boxes.some(
        (box) =>
          box.phase !== 'leaving' &&
          Math.hypot(box.x - state.player.x, box.y - state.player.y) < SKY.PUNCH_HIT_RADIUS,
      );
      drawGlove(state, target);
    },
  };
}
