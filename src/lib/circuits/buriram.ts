import type { CircuitConfig } from './types';

/**
 * Buriram International Circuit
 *
 * SVG path traced from the official Buriram track map.
 * viewBox: 800 × 450 — designed for the MapWidget aspect ratio.
 *
 * To update: re-export the path from Figma/Inkscape and replace `pathData`.
 */
export const BURIRAM_CIRCUIT: CircuitConfig = {
  id: 'buriram',
  name: 'Buriram International Circuit',
  viewBox: '0 0 800 450',
  pathData:
    'M 100 300 L 140 100 Q 150 60 200 70 L 720 140 Q 780 150 740 190 L 350 160 Q 300 160 250 200 L 200 250 Q 160 280 200 310 Q 220 330 250 300 Q 280 270 320 280 L 520 280 Q 560 280 580 320 Q 600 380 540 380 Q 500 380 480 350 Q 460 320 400 360 L 150 380 Q 80 380 100 300 Z',
  turns: [
    { id: '1', x: 180, y: 80 },
    { id: '2', x: 500, y: 120 },
    { id: '3', x: 750, y: 150 },
    { id: '4', x: 300, y: 180 },
    { id: '5', x: 180, y: 280 },
    { id: '6', x: 250, y: 320 },
    { id: '7', x: 320, y: 280 },
    { id: '8', x: 550, y: 280 },
    { id: '9', x: 600, y: 380 },
    { id: '10', x: 450, y: 340 },
    { id: '11', x: 350, y: 380 },
    { id: '12', x: 120, y: 380 },
  ],
  sectors: [
    { id: 'S1', startProgress: 0, endProgress: 0.33 },
    { id: 'S2', startProgress: 0.33, endProgress: 0.66 },
    { id: 'S3', startProgress: 0.66, endProgress: 1.0 },
  ],
};
