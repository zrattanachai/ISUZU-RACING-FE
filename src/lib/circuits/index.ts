/**
 * Circuit registry
 *
 * All available circuit configurations are registered here.
 * Import a circuit config and add it to the CIRCUITS map to make it
 * selectable by the MapWidget and other consumers.
 *
 * Adding a new track:
 *   1. Create `src/lib/circuits/<track-name>.ts` exporting a CircuitConfig.
 *   2. Import it here and add an entry to CIRCUITS.
 */

export type { CircuitConfig, CircuitTurn, CircuitSector } from './types';

import type { CircuitConfig } from './types';
import { BIRA_CIRCUIT } from './bira';
import { BURIRAM_CIRCUIT } from './buriram';

/** All registered circuits keyed by their id. */
const CIRCUITS = new Map<string, CircuitConfig>([
  [BIRA_CIRCUIT.id, BIRA_CIRCUIT],
  [BURIRAM_CIRCUIT.id, BURIRAM_CIRCUIT],
]);

/** Default circuit used when no specific circuit is requested. */
export const DEFAULT_CIRCUIT = BURIRAM_CIRCUIT;
// export const DEFAULT_CIRCUIT = BIRA_CIRCUIT;

/** Look up a circuit by id; returns the default circuit if not found. */
export function getCircuit(circuitId: string): CircuitConfig {
  return CIRCUITS.get(circuitId) ?? DEFAULT_CIRCUIT;
}

/** List all registered circuits (for pickers / admin UI). */
export function listCircuits(): CircuitConfig[] {
  return Array.from(CIRCUITS.values());
}
