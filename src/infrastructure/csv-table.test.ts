import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCsvTableIfMissing, readCsvTable, writeCsvTable } from './csv-table.js';

const HEADER = ['id', 'hashedPassword'];

describe('CSV table', () => {
    let dir: string;
    let table: string;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'csv-table-'));
        table = join(dir, 'admins.csv');
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    it('writes the header and rows in order and reads the same rows back', () => {
        writeCsvTable(table, HEADER, [['id1', 'h1'], ['id2', 'h2']]);

        expect(readFileSync(table, 'utf8')).toBe('id,hashedPassword\nid1,h1\nid2,h2\n');
        expect(readCsvTable(table, HEADER)).toEqual([['id1', 'h1'], ['id2', 'h2']]);
    });

    it('reads tables saved with Windows line endings or without a final newline', () => {
        writeFileSync(table, 'id,hashedPassword\r\nid1,h1\r\nid2,h2');

        expect(readCsvTable(table, HEADER)).toEqual([['id1', 'h1'], ['id2', 'h2']]);
    });

    it('rejects a table whose header does not match', () => {
        writeFileSync(table, 'id,password\nid1,h1\n');

        expect(() => readCsvTable(table, HEADER)).toThrow('expected "id,hashedPassword", got "id,password"');
    });

    it('rejects rows with the wrong number of columns and reports the line', () => {
        writeFileSync(table, 'id,hashedPassword\nid1,h1\nid2,h2,extra\n');

        expect(() => readCsvTable(table, HEADER)).toThrow(`${table}:3: expected 2 columns, got 3`);
    });

    it('rejects blank lines inside the table instead of skipping them', () => {
        writeFileSync(table, 'id,hashedPassword\n\nid1,h1\n');

        expect(() => readCsvTable(table, HEADER)).toThrow(`${table}:2`);
    });

    it('fails clearly when the table does not exist', () => {
        expect(() => readCsvTable(table, HEADER)).toThrow(`Table not found: ${table}`);
    });

    it('refuses cells that would break the CSV and keeps the previous content intact', () => {
        writeCsvTable(table, HEADER, [['id1', 'h1']]);
        const before = readFileSync(table, 'utf8');

        for (const cell of ['a,b', 'a"b', 'a\nb', 'a\rb']) {
            expect(() => writeCsvTable(table, HEADER, [[cell, 'h']])).toThrow('contains a comma, quote or line break');
        }
        expect(() => writeCsvTable(table, HEADER, [['only-one-column']])).toThrow('Every row must have 2 columns.');
        expect(readFileSync(table, 'utf8')).toBe(before);
    });

    it('replaces the file without leaving temporary files behind', () => {
        writeCsvTable(table, HEADER, [['id1', 'h1']]);
        writeCsvTable(table, HEADER, [['id2', 'h2']]);

        expect(readdirSync(dir)).toEqual(['admins.csv']);
        expect(readCsvTable(table, HEADER)).toEqual([['id2', 'h2']]);
    });

    it('cleans up the temporary file when replacing the table fails', () => {
        mkdirSync(table); // a directory where the table should be makes the final rename fail

        expect(() => writeCsvTable(table, HEADER, [['id1', 'h1']])).toThrow();
        expect(readdirSync(dir)).toEqual(['admins.csv']);
        expect(readdirSync(table)).toEqual([]);
    });

    it('creates a missing table (and its folders) but never overwrites an existing one', () => {
        const nested = join(dir, 'data', 'tables', 'admins.csv');

        createCsvTableIfMissing(nested, HEADER);
        expect(readFileSync(nested, 'utf8')).toBe('id,hashedPassword\n');

        writeCsvTable(nested, HEADER, [['id1', 'h1']]);
        createCsvTableIfMissing(nested, HEADER);
        expect(readCsvTable(nested, HEADER)).toEqual([['id1', 'h1']]);
    });
});
