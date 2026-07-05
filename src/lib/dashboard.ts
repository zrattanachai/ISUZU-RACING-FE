import type { Layout } from 'react-grid-layout';

export const INITIAL_MAIN_LAYOUT: Layout = [
  { i: 'sensors', x: 0, y: 0, w: 9, h: 6, minW: 6, minH: 3 },
  { i: 'alerts', x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'connection', x: 9, y: 3, w: 3, h: 3, minW: 2, minH: 2 },
];

export function createDefaultSensorLayout(sensorCount: number): Layout {
  return Array.from({ length: sensorCount }, (_, index) => ({
    i: index.toString(),
    x: (index % 3) * 4,
    y: Math.floor(index / 3) * 3,
    w: 4,
    h: 3,
  }));
}
