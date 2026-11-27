'use client';

import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

export type AccessorySpec = { emoji: string; slot: 'head' | 'face' } | null | undefined;

/** Emoji hat/glasses rendered as a sprite inside the 3D scene (no DOM overlay). */
export function Accessory({ accessory, size = 0.5 }: { accessory: AccessorySpec; size?: number }) {
  const texture = useMemo(() => {
    if (!accessory || typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.font = '200px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(accessory.emoji, 128, 140);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [accessory]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  return (
    <sprite scale={[size, size, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}
