/** Turn marker position on the SVG canvas. */
export interface CircuitTurn {
  id: string;
  x: number;
  y: number;
}

/** Sector boundary expressed as a normalized progress value (0–1). */
export interface CircuitSector {
  id: string;
  startProgress: number;
  endProgress: number;
}

/**
 * A circuit configuration describes the SVG track shape exported from
 * design tools such as Figma or Inkscape.
 *
 * To add a new circuit:
 *   1. Draw the centerline path in Figma/Inkscape.
 *   2. Export the `d` attribute from the `<path>` element.
 *   3. Create a new config file under `src/lib/circuits/` following this shape.
 *   4. Register it in `src/lib/circuits/index.ts`.
 */
export interface CircuitConfig {
  /** Unique identifier, e.g. `buriram`. */
  id: string;
  /** Human-readable name shown in the UI. */
  name: string;
  /** SVG viewBox, e.g. `"0 0 800 450"`. */
  viewBox: string;
  /** SVG `d` attribute describing the track centerline (closed path). */
  pathData: string;
  /** Turn marker positions on the SVG canvas. */
  turns: CircuitTurn[];
  /** Optional sector boundaries for race analytics. */
  sectors?: CircuitSector[];
}
