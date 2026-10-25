import { SessionType } from './session-type.js';

/**
 * Session-specific data carried by a voter:
 * - CONCLAVE: no attribute (`null`)
 * - ONU: whether the voter is a permanent member (`boolean`)
 * - CONDOMINIUM: the ideal fraction of the voter's unit (`number` > 0)
 */
export type VoterAttribute = null | boolean | number;

export interface VoterProfile {
    readonly sessionType: SessionType;
    readonly attribute: VoterAttribute;
}

const FORBIDDEN_ID_CHARS = /[,"\r\n]/;

/** Textual form used in `voterTable` for a CONCLAVE voter (no attribute). */
export const NO_ATTRIBUTE = 'None';

export function assertValidUserId(id: string): void {
    if (id.trim().length === 0) {
        throw new Error('User id must be a non-empty string.');
    }
    if (id !== id.trim()) {
        throw new Error('User id must not start or end with whitespace.');
    }
    if (FORBIDDEN_ID_CHARS.test(id)) {
        throw new Error('User id must not contain commas, quotes or line breaks.');
    }
}

/** Throws if `attribute` is not the kind of value that `sessionType` requires. */
export function assertAttributeMatches(sessionType: SessionType, attribute: VoterAttribute): void {
    switch (sessionType) {
        case SessionType.CONCLAVE:
            if (attribute !== null) {
                throw new Error('A CONCLAVE voter must not have an attribute.');
            }
            return;
        case SessionType.ONU:
            if (typeof attribute !== 'boolean') {
                throw new Error('An ONU voter attribute must be a boolean (permanent member or not).');
            }
            return;
        case SessionType.CONDOMINIUM:
            if (typeof attribute !== 'number' || !Number.isFinite(attribute) || attribute <= 0) {
                throw new Error('A CONDOMINIUM voter attribute must be an ideal fraction greater than zero.');
            }
            return;
        default:
            throw new Error(`Unknown session type "${String(sessionType)}".`);
    }
}

const DECIMAL_NUMBER = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

/** Converts the textual `attribute` column of `voterTable` into a typed value. */
export function parseAttribute(sessionType: SessionType, raw: string): VoterAttribute {
    let attribute: VoterAttribute;
    if (sessionType === SessionType.CONCLAVE) {
        if (raw !== NO_ATTRIBUTE) {
            throw new Error(`A CONCLAVE voter attribute must be "${NO_ATTRIBUTE}", got "${raw}".`);
        }
        attribute = null;
    } else if (sessionType === SessionType.ONU) {
        if (raw !== 'true' && raw !== 'false') {
            throw new Error(`An ONU voter attribute must be "true" or "false", got "${raw}".`);
        }
        attribute = raw === 'true';
    } else {
        if (!DECIMAL_NUMBER.test(raw)) {
            throw new Error(`A CONDOMINIUM voter attribute must be a decimal number, got "${raw}".`);
        }
        attribute = Number(raw);
    }
    assertAttributeMatches(sessionType, attribute);
    return attribute;
}

/** Inverse of `parseAttribute`: `formatAttribute` output is always accepted by `parseAttribute`. */
export function formatAttribute(attribute: VoterAttribute): string {
    return attribute === null ? NO_ATTRIBUTE : String(attribute);
}

/**
 * An authenticated user, returned by `UserController.login`.
 * Administrators have no session type nor attribute; voters always have both, and the
 * attribute is guaranteed to match the session type. Instances are immutable.
 */
export class User {
    private constructor(
        public readonly id: string,
        public readonly isAdmin: boolean,
        public readonly sessionType: SessionType | null,
        public readonly attribute: VoterAttribute
    ) {
        Object.freeze(this);
    }

    static admin(id: string): User {
        assertValidUserId(id);
        return new User(id, true, null, null);
    }

    static voter(id: string, profile: VoterProfile): User {
        assertValidUserId(id);
        assertAttributeMatches(profile.sessionType, profile.attribute);
        return new User(id, false, profile.sessionType, profile.attribute);
    }
}
