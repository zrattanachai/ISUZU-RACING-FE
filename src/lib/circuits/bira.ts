import type { CircuitConfig } from './types';

/**
 * Bira Circuit
 *
 * SVG centerline normalized from the provided GeoJSON LineString.
 *
 * The map widget renders this projected track path in a fixed 800x450 viewBox,
 * so longitude / latitude coordinates are scaled into local SVG coordinates.
 *
 * The accompanying GeoJSON Point is not persisted here because CircuitConfig
 * currently models only the rendered track path, turn markers, and sectors.
 */
export const BIRA_CIRCUIT: CircuitConfig = {
    id: 'bira',
    name: 'Bira Circuit',
    viewBox: '0 0 800 450',
    pathData:
        'M 358 210 L 386 222 L 427 239 L 458 251 L 488 263 L 511 272 L 536 278 L 567 286 L 594 292 L 630 298 L 648 296 L 666 288 L 678 272 L 682 261 L 684 246 L 678 232 L 666 223 L 647 208 L 626 193 L 607 181 L 590 170 L 575 159 L 554 148 L 535 134 L 518 123 L 509 115 L 506 103 L 506 95 L 511 86 L 520 80 L 528 76 L 540 75 L 553 77 L 560 79 L 571 88 L 580 93 L 608 110 L 632 127 L 660 141 L 679 154 L 703 169 L 726 183 L 739 193 L 754 208 L 759 223 L 760 240 L 758 259 L 758 275 L 758 290 L 753 315 L 749 329 L 736 342 L 720 350 L 704 357 L 688 364 L 673 371 L 655 372 L 636 375 L 617 372 L 596 368 L 569 361 L 550 355 L 527 347 L 511 342 L 495 336 L 476 330 L 451 322 L 434 316 L 418 310 L 407 307 L 395 304 L 388 306 L 376 314 L 367 314 L 355 310 L 336 301 L 313 292 L 291 283 L 279 279 L 261 271 L 251 266 L 238 260 L 223 254 L 211 249 L 198 244 L 186 240 L 172 236 L 162 233 L 155 239 L 150 242 L 136 240 L 114 235 L 87 230 L 68 227 L 57 224 L 48 220 L 42 213 L 40 203 L 44 192 L 52 185 L 61 176 L 71 166 L 83 155 L 94 145 L 110 134 L 121 128 L 135 124 L 146 124 L 162 127 L 182 135 L 208 147 L 232 156 L 257 167 L 279 176 L 306 188 L 336 199 L 357 210 Z',
    turns: [
        { id: '1', x: 358, y: 210 },
        { id: '2', x: 648, y: 296 },
        { id: '3', x: 607, y: 181 },
        { id: '4', x: 520, y: 80 },
        { id: '5', x: 679, y: 154 },
        { id: '6', x: 758, y: 290 },
        { id: '7', x: 617, y: 372 },
        { id: '8', x: 418, y: 310 },
        { id: '9', x: 291, y: 283 },
        { id: '10', x: 162, y: 233 },
        { id: '11', x: 40, y: 203 },
        { id: '12', x: 135, y: 124 },
    ],
    sectors: [
        { id: 'S1', startProgress: 0, endProgress: 0.34 },
        { id: 'S2', startProgress: 0.34, endProgress: 0.67 },
        { id: 'S3', startProgress: 0.67, endProgress: 1.0 },
    ],
};