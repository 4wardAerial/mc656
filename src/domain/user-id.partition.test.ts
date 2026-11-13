import { describe, expect, it } from 'vitest';
import { assertValidUserId } from './user.js';

/*
 * Escopo: identificador do usuário (assertValidUserId, src/domain/user.ts).
 *
 * O id é a chave de login e vai para uma célula de CSV sem aspas, então precisa ser não vazio,
 * sem espaços nas pontas e sem vírgula, aspas ou quebra de linha. As verificações acontecem
 * nessa ordem e cada uma tem a própria mensagem.
 */

const MSG_EMPTY = 'User id must be a non-empty string.';
const MSG_PADDED = 'User id must not start or end with whitespace.';
const MSG_FORBIDDEN = 'User id must not contain commas, quotes or line breaks.';

describe('assertValidUserId – particionamento em classes de equivalência', () => {
    describe('CE1 (válida): id sem espaços nas pontas e sem caracteres proibidos', () => {
        it.each(['ana', 'ana.costa', 'user 1', 'Cardinal Silva', 'a'])('aceita "%s"', (id) => {
            expect(() => assertValidUserId(id)).not.toThrow();
        });
    });

    describe('CE2 (inválida): id vazio', () => {
        it('rejeita a string vazia', () => {
            expect(() => assertValidUserId('')).toThrow(MSG_EMPTY);
        });
    });

    describe('CE3 (inválida): id formado só por espaços em branco', () => {
        it.each(['   ', ' ', '\t'])('rejeita %j com a mesma mensagem do id vazio', (id) => {
            expect(() => assertValidUserId(id)).toThrow(MSG_EMPTY);
        });
    });

    describe('CE4 (inválida): espaço em branco no início ou no fim', () => {
        it.each([' ana', 'ana ', ' ana '])('rejeita %j', (id) => {
            expect(() => assertValidUserId(id)).toThrow(MSG_PADDED);
        });

        it('trata quebra de linha na ponta como espaço na ponta (a checagem de pontas vem antes da de caracteres proibidos)', () => {
            expect(() => assertValidUserId('ana\n')).toThrow(MSG_PADDED);
        });
    });

    describe('CE5 (inválida): id com vírgula', () => {
        it.each(['a,b', 'ana,costa'])('rejeita "%s"', (id) => {
            expect(() => assertValidUserId(id)).toThrow(MSG_FORBIDDEN);
        });
    });

    describe('CE6 (inválida): id com aspas', () => {
        it('rejeita aspas duplas no meio do id', () => {
            expect(() => assertValidUserId('a"b')).toThrow(MSG_FORBIDDEN);
        });
    });

    describe('CE7 (inválida): id com quebra de linha no meio', () => {
        it.each([['a\nb'], ['a\rb'], ['a\r\nb']])('rejeita %j', (id) => {
            expect(() => assertValidUserId(id)).toThrow(MSG_FORBIDDEN);
        });
    });
});