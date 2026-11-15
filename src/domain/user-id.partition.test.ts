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
 
describe('assertValidUserId - equivalence class partitioning', () => {
    describe('CE1 (valid): id without leading/trailing whitespace and without forbidden characters', () => {
        it.each(['ana', 'ana.costa', 'user 1', 'Cardinal Silva', 'a'])('accepts "%s"', (id) => {
            expect(() => assertValidUserId(id)).not.toThrow();
        });
    });
 
    describe('CE2 (invalid): empty id', () => {
        it('rejects the empty string', () => {
            expect(() => assertValidUserId('')).toThrow(MSG_EMPTY);
        });
    });
 
    describe('CE3 (invalid): id made only of whitespace', () => {
        it.each(['   ', ' ', '\t'])('rejects %j with the same message as the empty id', (id) => {
            expect(() => assertValidUserId(id)).toThrow(MSG_EMPTY);
        });
    });
 
    describe('CE4 (invalid): whitespace at the start or at the end', () => {
        it.each([' ana', 'ana ', ' ana '])('rejects %j', (id) => {
            expect(() => assertValidUserId(id)).toThrow(MSG_PADDED);
        });
 
        it('treats a trailing line break as trailing whitespace (the padding check runs before the forbidden-character check)', () => {
            expect(() => assertValidUserId('ana\n')).toThrow(MSG_PADDED);
        });
    });
 
    describe('CE5 (invalid): id with a comma', () => {
        it.each(['a,b', 'ana,costa'])('rejects "%s"', (id) => {
            expect(() => assertValidUserId(id)).toThrow(MSG_FORBIDDEN);
        });
    });
 
    describe('CE6 (invalid): id with a quote', () => {
        it('rejects a double quote in the middle of the id', () => {
            expect(() => assertValidUserId('a"b')).toThrow(MSG_FORBIDDEN);
        });
    });
 
    describe('CE7 (invalid): id with a line break in the middle', () => {
        it.each([['a\nb'], ['a\rb'], ['a\r\nb']])('rejects %j', (id) => {
            expect(() => assertValidUserId(id)).toThrow(MSG_FORBIDDEN);
        });
    });
});