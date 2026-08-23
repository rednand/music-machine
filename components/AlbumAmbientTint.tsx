"use client";

import { useEffect } from "react";

const CSS_VAR = "--album-tint";
const ALPHA_CSS_VAR = "--album-tint-alpha";
const ACTIVE_ALPHA = "0.38";
const SAMPLE_SIZE = 16;
const VIBRANT_SATURATION_THRESHOLD = 0.22;

function pickAmbientColor(data: Uint8ClampedArray): string {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  let bestScore = -1;
  let vibrant: { r: number; g: number; b: number; saturation: number } | null = null;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    rSum += r;
    gSum += g;
    bSum += b;
    count += 1;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2 / 255;
    const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
    // Prefer saturated, mid-lightness pixels — a flat average of a colorful cover tends to cancel out into gray.
    const score = saturation * (1 - Math.abs(lightness - 0.5));

    if (score > bestScore) {
      bestScore = score;
      vibrant = { r, g, b, saturation };
    }
  }

  if (vibrant && vibrant.saturation >= VIBRANT_SATURATION_THRESHOLD) {
    return `${vibrant.r}, ${vibrant.g}, ${vibrant.b}`;
  }
  return `${Math.round(rSum / count)}, ${Math.round(gSum / count)}, ${Math.round(bSum / count)}`;
}

export function AlbumAmbientTint({ coverArtUrl }: { coverArtUrl?: string }) {
  useEffect(() => {
    if (!coverArtUrl) {
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (cancelled) {
        return;
      }
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return;
        }
        ctx.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

        document.documentElement.style.setProperty(CSS_VAR, pickAmbientColor(data));
        document.documentElement.style.setProperty(ALPHA_CSS_VAR, ACTIVE_ALPHA);
      } catch {
        // Cover art host may not allow CORS canvas reads — keep the default ambient background
      }
    };
    image.src = coverArtUrl;

    return () => {
      cancelled = true;
      document.documentElement.style.removeProperty(CSS_VAR);
      document.documentElement.style.removeProperty(ALPHA_CSS_VAR);
    };
  }, [coverArtUrl]);

  return null;
}
