import { describe, expect, it } from 'vitest';
import { SessionType } from './session-type.js';
import { type VoterAttribute, assertAttributeMatches, parseAttribute } from './user.js';

/*
 * Escopo: atributo do votante (src/domain/user.ts).
 *
 * parseAttribute(sessionType, raw): entrada de duas dimensões, o tipo de sessão e o texto da
 * coluna `attribute` do voterTable. Cada tipo de sessão tem a própria regra, então as classes
 * são definidas por (tipo de sessão x forma do texto).
 *
 * assertAttributeMatches(sessionType, attribute): usa a mesma regra, mas sobre o valor tipado
 * usado por User.voter. Classes CV1 a CV8.
 */

describe('parseAttribute - equivalence class partitioning', () => {
    describe('CE1 (valid): CONCLAVE with the text "None"', () => {
        it('converts "None" to null', () => {
            expect(parseAttribute(SessionType.CONCLAVE, 'None')).toBeNull();
        });
    });
 
    describe('CE2 (invalid): CONCLAVE with any other text', () => {
        it.each(['true', '0.3', 'none', ''])('rejects "%s"', (raw) => {
            expect(() => parseAttribute(SessionType.CONCLAVE, raw)).toThrow(
                `A CONCLAVE voter attribute must be "None", got "${raw}".`
            );
        });
    });
 
    describe('CE3 (valid): ONU with "true" or "false"', () => {
        it('converts "true" to true', () => {
            expect(parseAttribute(SessionType.ONU, 'true')).toBe(true);
        });
 
        it('converts "false" to false (not to just any falsy value)', () => {
            expect(parseAttribute(SessionType.ONU, 'false')).toBe(false);
        });
    });
 
    describe('CE4 (invalid): ONU with any other text', () => {
        it.each(['TRUE', '1', 'yes', 'None', ''])('rejects "%s"', (raw) => {
            expect(() => parseAttribute(SessionType.ONU, raw)).toThrow(
                `An ONU voter attribute must be "true" or "false", got "${raw}".`
            );
        });
    });
 
    describe('CE5 (valid): CONDOMINIUM with a positive decimal', () => {
        it.each<[string, number]>([
            ['0.25', 0.25],
            ['.5', 0.5],
            ['1e-3', 0.001],
            ['3', 3]
        ])('converts "%s" to %d', (raw, expected) => {
            expect(parseAttribute(SessionType.CONDOMINIUM, raw)).toBe(expected);
        });
    });
 
    describe('CE6 (invalid): CONDOMINIUM with numeric text whose value is not positive', () => {
        // "1e-400" matches the decimal format, but Number() turns it into 0 (underflow).
        it.each(['0', '0.0', '1e-400'])('rejects "%s" because it evaluates to zero', (raw) => {
            expect(() => parseAttribute(SessionType.CONDOMINIUM, raw)).toThrow(
                'A CONDOMINIUM voter attribute must be an ideal fraction greater than zero.'
            );
        });
    });
 
    describe('CE7 (invalid): CONDOMINIUM with text that is not a decimal (non-numeric, negative or empty)', () => {
        it.each(['abc', '-0.2', '', ' 4.2', '4,2', '0x10', 'NaN', 'Infinity'])('rejects "%s"', (raw) => {
            expect(() => parseAttribute(SessionType.CONDOMINIUM, raw)).toThrow(
                `A CONDOMINIUM voter attribute must be a decimal number, got "${raw}".`
            );
        });
    });
 
    describe('CE8 (invalid): CONDOMINIUM with a decimal that overflows to infinity', () => {
        it('rejects "1e999" (Number() yields Infinity)', () => {
            expect(() => parseAttribute(SessionType.CONDOMINIUM, '1e999')).toThrow(
                'A CONDOMINIUM voter attribute must be an ideal fraction greater than zero.'
            );
        });
    });
});
 
describe('assertAttributeMatches - equivalence class partitioning', () => {
    describe('CV1 (valid): CONCLAVE with null', () => {
        it('accepts it', () => {
            expect(() => assertAttributeMatches(SessionType.CONCLAVE, null)).not.toThrow();
        });
    });
 
    describe('CV2 (invalid): CONCLAVE with any non-null value', () => {
        // false and 0 are falsy but are not null (rule is !== null)
        it.each<VoterAttribute>([true, false, 0, 0.5])('rejects %s', (attribute) => {
            expect(() => assertAttributeMatches(SessionType.CONCLAVE, attribute)).toThrow(
                'A CONCLAVE voter must not have an attribute.'
            );
        });
    });
 
    describe('CV3 (valid): ONU with a boolean', () => {
        it.each([true, false])('accepts %s', (attribute) => {
            expect(() => assertAttributeMatches(SessionType.ONU, attribute)).not.toThrow();
        });
    });
 
    describe('CV4 (invalid): ONU with a non-boolean value', () => {
        it.each<VoterAttribute>([null, 0, 1])('rejects %s', (attribute) => {
            expect(() => assertAttributeMatches(SessionType.ONU, attribute)).toThrow(
                'An ONU voter attribute must be a boolean'
            );
        });
    });
 
    describe('CV5 (valid): CONDOMINIUM with a finite positive number', () => {
        it.each([0.25, 3, 1e21])('accepts %s', (attribute) => {
            expect(() => assertAttributeMatches(SessionType.CONDOMINIUM, attribute)).not.toThrow();
        });
    });
 
    describe('CV6 (invalid): CONDOMINIUM with a number less than or equal to zero', () => {
        it.each([0, -0, -0.5])('rejects %s', (attribute) => {
            expect(() => assertAttributeMatches(SessionType.CONDOMINIUM, attribute)).toThrow(
                'A CONDOMINIUM voter attribute must be an ideal fraction greater than zero.'
            );
        });
    });
 
    describe('CV7 (invalid): CONDOMINIUM with a non-finite number', () => {
        it.each([Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', (attribute) => {
            expect(() => assertAttributeMatches(SessionType.CONDOMINIUM, attribute)).toThrow(
                'A CONDOMINIUM voter attribute must be an ideal fraction greater than zero.'
            );
        });
    });
 
    describe('CV8 (invalid): CONDOMINIUM with a value that is not a number', () => {
        it.each<VoterAttribute>([null, true, false])('rejects %s', (attribute) => {
            expect(() => assertAttributeMatches(SessionType.CONDOMINIUM, attribute)).toThrow(
                'A CONDOMINIUM voter attribute must be an ideal fraction greater than zero.'
            );
        });
    });
});