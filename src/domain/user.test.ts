import { describe, it, expect } from 'vitest';
import { SessionType, parseSessionType } from './session-type.js';
import { User, type VoterAttribute, formatAttribute, parseAttribute } from './user.js';

describe('attribute column (voterTable)', () => {
    const accepted: [SessionType, string, VoterAttribute][] = [
        [SessionType.CONCLAVE, 'None', null],
        [SessionType.ONU, 'true', true],
        [SessionType.ONU, 'false', false],
        [SessionType.CONDOMINIUM, '4.2', 4.2],
        [SessionType.CONDOMINIUM, '3', 3],
        [SessionType.CONDOMINIUM, '.5', 0.5],
        [SessionType.CONDOMINIUM, '1e-7', 1e-7]
    ];

    for (const [type, raw, expected] of accepted) {
        it(`reads "${raw}" as ${String(expected)} for a ${type} voter`, () => {
            expect(parseAttribute(type, raw)).toBe(expected);
        });
    }

    const rejected: [SessionType, string][] = [
        [SessionType.CONCLAVE, ''],
        [SessionType.CONCLAVE, 'none'],
        [SessionType.CONCLAVE, 'false'],
        [SessionType.CONCLAVE, '4.2'],
        [SessionType.ONU, 'True'],
        [SessionType.ONU, '1'],
        [SessionType.ONU, 'yes'],
        [SessionType.ONU, 'None'],
        [SessionType.ONU, ''],
        [SessionType.CONDOMINIUM, '0'],
        [SessionType.CONDOMINIUM, '0.0'],
        [SessionType.CONDOMINIUM, '-1'],
        [SessionType.CONDOMINIUM, '4,2'],
        [SessionType.CONDOMINIUM, ' 4.2'],
        [SessionType.CONDOMINIUM, '0x10'],
        [SessionType.CONDOMINIUM, 'Infinity'],
        [SessionType.CONDOMINIUM, 'NaN'],
        [SessionType.CONDOMINIUM, 'None'],
        [SessionType.CONDOMINIUM, '']
    ];

    for (const [type, raw] of rejected) {
        it(`rejects "${raw}" for a ${type} voter`, () => {
            expect(() => parseAttribute(type, raw)).toThrow();
        });
    }

    it('reads back exactly the value it writes, including fractions with long or exponent forms', () => {
        const values: [SessionType, VoterAttribute][] = [
            [SessionType.CONCLAVE, null],
            [SessionType.ONU, true],
            [SessionType.ONU, false],
            ...[0.1, 1 / 3, 4.2, 1e-7, 1e21, 123456789.125].map((n): [SessionType, VoterAttribute] => [SessionType.CONDOMINIUM, n])
        ];

        for (const [type, value] of values) {
            expect(parseAttribute(type, formatAttribute(value))).toBe(value);
        }
    });
});

describe('sessionType column (voterTable)', () => {
    it('accepts only the persisted enum values', () => {
        expect(parseSessionType('ONU')).toBe(SessionType.ONU);
        expect(() => parseSessionType('Onu')).toThrow('Unknown session type "Onu"');
        expect(() => parseSessionType('')).toThrow('Unknown session type ""');
    });
});

describe('User', () => {
    it('only accepts a voter whose attribute matches the session type', () => {
        const mismatches: [SessionType, VoterAttribute][] = [
            [SessionType.CONCLAVE, true],
            [SessionType.CONCLAVE, 1],
            [SessionType.ONU, null],
            [SessionType.ONU, 1],
            [SessionType.CONDOMINIUM, null],
            [SessionType.CONDOMINIUM, true],
            [SessionType.CONDOMINIUM, 0],
            [SessionType.CONDOMINIUM, -0.5],
            [SessionType.CONDOMINIUM, Number.NaN],
            [SessionType.CONDOMINIUM, Number.POSITIVE_INFINITY]
        ];

        for (const [sessionType, attribute] of mismatches) {
            expect(() => User.voter('v1', { sessionType, attribute })).toThrow();
        }
    });

    it('rejects a session type that is not part of the enum, even if it bypassed the type checker', () => {
        const sessionType = 'PARLIAMENT' as SessionType;

        expect(() => User.voter('v1', { sessionType, attribute: null })).toThrow('Unknown session type "PARLIAMENT"');
    });

    it('rejects ids that are empty, padded or would break the CSV tables', () => {
        for (const id of ['', '   ', ' ana', 'ana ', 'a,b', 'a"b', 'a\nb']) {
            expect(() => User.admin(id)).toThrow();
            expect(() => User.voter(id, { sessionType: SessionType.CONCLAVE, attribute: null })).toThrow();
        }
        expect(User.admin('Cardinal Silva').id).toBe('Cardinal Silva');
    });
});
