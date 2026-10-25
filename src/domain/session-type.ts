/**
 * The three voting models supported by the platform.
 *
 * Kept in its own module so that both the user side (`User`, `UserController`) and the
 * voting side (`VotingSession` hierarchy, `VotingController`) can depend on it without
 * depending on each other. The string values are the ones persisted in `voterTable`.
 */
export enum SessionType {
    CONCLAVE = 'CONCLAVE',
    CONDOMINIUM = 'CONDOMINIUM',
    ONU = 'ONU'
}

const SESSION_TYPES: readonly string[] = Object.values(SessionType);

export function parseSessionType(raw: string): SessionType {
    if (!SESSION_TYPES.includes(raw)) {
        throw new Error(`Unknown session type "${raw}". Expected one of: ${SESSION_TYPES.join(', ')}.`);
    }
    return raw as SessionType;
}
