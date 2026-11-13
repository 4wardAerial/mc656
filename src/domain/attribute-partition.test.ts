import { describe, expect, it } from 'vitest';
import { SessionType } from './session-type.js';
import { type VoterAttribute, assertAttributeMatches, parseAttribute } from './user.js';

describe('parseAttribute – particionamento em classes de equivalência', () => {
    describe('CE1 (válida): CONCLAVE com o texto "None"', () => {
        it('converte "None" em null', () => {
            expect(parseAttribute(SessionType.CONCLAVE, 'None')).toBeNull();
        });
    });

    describe('CE2 (inválida): CONCLAVE com qualquer outro texto', () => {
        it.each(['true', '0.3', 'none', ''])('rejeita "%s"', (raw) => {
            expect(() => parseAttribute(SessionType.CONCLAVE, raw)).toThrow(
                `A CONCLAVE voter attribute must be "None", got "${raw}".`
            );
        });
    });

    describe('CE3 (válida): ONU com "true" ou "false"', () => {
        it('converte "true" em true', () => {
            expect(parseAttribute(SessionType.ONU, 'true')).toBe(true);
        });

        it('converte "false" em false (e não em um valor "falsy" qualquer)', () => {
            expect(parseAttribute(SessionType.ONU, 'false')).toBe(false);
        });
    });

    describe('CE4 (inválida): ONU com outro texto', () => {
        it.each(['TRUE', '1', 'sim', 'None', ''])('rejeita "%s"', (raw) => {
            expect(() => parseAttribute(SessionType.ONU, raw)).toThrow(
                `An ONU voter attribute must be "true" or "false", got "${raw}".`
            );
        });
    });

    describe('CE5 (válida): CONDOMINIUM com decimal positivo', () => {
        it.each<[string, number]>([
            ['0.25', 0.25],
            ['.5', 0.5],
            ['1e-3', 0.001],
            ['3', 3]
        ])('converte "%s" em %d', (raw, expected) => {
            expect(parseAttribute(SessionType.CONDOMINIUM, raw)).toBe(expected);
        });
    });

    describe('CE6 (inválida): CONDOMINIUM com texto numérico cujo valor não é positivo', () => {
        // "1e-400" passa pelo formato decimal, mas Number() o converte em 0 (underflow).
        it.each(['0', '0.0', '1e-400'])('rejeita "%s" por resultar em zero', (raw) => {
            expect(() => parseAttribute(SessionType.CONDOMINIUM, raw)).toThrow(
                'A CONDOMINIUM voter attribute must be an ideal fraction greater than zero.'
            );
        });
    });

    describe('CE7 (inválida): CONDOMINIUM com texto que não é decimal (não numérico, negativo ou vazio)', () => {
        it.each(['abc', '-0.2', '', ' 4.2', '4,2', '0x10', 'NaN', 'Infinity'])('rejeita "%s"', (raw) => {
            expect(() => parseAttribute(SessionType.CONDOMINIUM, raw)).toThrow(
                `A CONDOMINIUM voter attribute must be a decimal number, got "${raw}".`
            );
        });
    });

    describe('CE8 (inválida): CONDOMINIUM com decimal que estoura para infinito', () => {
        it('rejeita "1e999" (Number() resulta em Infinity)', () => {
            expect(() => parseAttribute(SessionType.CONDOMINIUM, '1e999')).toThrow(
                'A CONDOMINIUM voter attribute must be an ideal fraction greater than zero.'
            );
        });
    });
});

describe('assertAttributeMatches – particionamento em classes de equivalência', () => {
    describe('CV1 (válida): CONCLAVE com null', () => {
        it('aceita', () => {
            expect(() => assertAttributeMatches(SessionType.CONCLAVE, null)).not.toThrow();
        });
    });

    describe('CV2 (inválida): CONCLAVE com qualquer valor não nulo', () => {
        // false e 0 são "falsy" mas não null (regra é !== null)
        it.each<VoterAttribute>([true, false, 0, 0.5])('rejeita %s', (attribute) => {
            expect(() => assertAttributeMatches(SessionType.CONCLAVE, attribute)).toThrow(
                'A CONCLAVE voter must not have an attribute.'
            );
        });
    });

    describe('CV3 (válida): ONU com booleano', () => {
        it.each([true, false])('aceita %s', (attribute) => {
            expect(() => assertAttributeMatches(SessionType.ONU, attribute)).not.toThrow();
        });
    });

    describe('CV4 (inválida): ONU com valor não booleano', () => {
        it.each<VoterAttribute>([null, 0, 1])('rejeita %s', (attribute) => {
            expect(() => assertAttributeMatches(SessionType.ONU, attribute)).toThrow(
                'An ONU voter attribute must be a boolean'
            );
        });
    });

    describe('CV5 (válida): CONDOMINIUM com número finito positivo', () => {
        it.each([0.25, 3, 1e21])('aceita %s', (attribute) => {
            expect(() => assertAttributeMatches(SessionType.CONDOMINIUM, attribute)).not.toThrow();
        });
    });

    describe('CV6 (inválida): CONDOMINIUM com número menor ou igual a zero', () => {
        it.each([0, -0, -0.5])('rejeita %s', (attribute) => {
            expect(() => assertAttributeMatches(SessionType.CONDOMINIUM, attribute)).toThrow(
                'A CONDOMINIUM voter attribute must be an ideal fraction greater than zero.'
            );
        });
    });

    describe('CV7 (inválida): CONDOMINIUM com número não finito', () => {
        it.each([Number.NaN, Number.POSITIVE_INFINITY])('rejeita %s', (attribute) => {
            expect(() => assertAttributeMatches(SessionType.CONDOMINIUM, attribute)).toThrow(
                'A CONDOMINIUM voter attribute must be an ideal fraction greater than zero.'
            );
        });
    });

    describe('CV8 (inválida): CONDOMINIUM com valor que não é número', () => {
        it.each<VoterAttribute>([null, true, false])('rejeita %s', (attribute) => {
            expect(() => assertAttributeMatches(SessionType.CONDOMINIUM, attribute)).toThrow(
                'A CONDOMINIUM voter attribute must be an ideal fraction greater than zero.'
            );
        });
    });
});