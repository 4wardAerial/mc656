import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname } from 'node:path';

/**
 * Minimal CSV storage for small tables whose cells never need quoting.
 *
 * Cells containing commas, quotes or line breaks are rejected on write instead of being
 * escaped: every value we store (ids, password hashes, enum values, numbers) can be
 * validated to avoid those characters, which keeps reading unambiguous.
 */
export type CsvRow = readonly string[];

const UNSAFE_CELL = /[,"\r\n]/;

function headerLine(header: CsvRow): string {
    return header.join(',');
}

/**
 * Reads a table and returns its rows without the header.
 * Throws if the file is missing, the header differs from `header`, or a row has the wrong
 * number of columns. Error messages include the 1-based line number.
 */
export function readCsvTable(path: string, header: CsvRow): string[][] {
    if (!existsSync(path)) {
        throw new Error(`Table not found: ${path}`);
    }
    const lines = readFileSync(path, 'utf8').split(/\r?\n/);
    if (lines.at(-1) === '') {
        lines.pop();
    }
    if (lines[0] !== headerLine(header)) {
        throw new Error(`Invalid header in ${path}: expected "${headerLine(header)}", got "${lines[0] ?? ''}".`);
    }
    return lines.slice(1).map((line, index) => {
        const cells = line.split(',');
        if (cells.length !== header.length) {
            throw new Error(`Invalid row at ${path}:${index + 2}: expected ${header.length} columns, got ${cells.length}.`);
        }
        return cells;
    });
}

/** Creates an empty table (header only) if `path` does not exist yet. */
export function createCsvTableIfMissing(path: string, header: CsvRow): void {
    if (!existsSync(path)) {
        writeCsvTable(path, header, []);
    }
}

/**
 * Replaces the whole table with `rows`. The new content is written to a temporary file in
 * the same directory and then renamed over the target, so a crash mid-write never leaves a
 * truncated table behind (rename is atomic on the same file system).
 */
export function writeCsvTable(path: string, header: CsvRow, rows: readonly CsvRow[]): void {
    for (const row of [header, ...rows]) {
        if (row.length !== header.length) {
            throw new Error(`Every row must have ${header.length} columns.`);
        }
        const unsafe = row.find((cell) => UNSAFE_CELL.test(cell));
        if (unsafe !== undefined) {
            throw new Error(`Cell "${unsafe}" contains a comma, quote or line break.`);
        }
    }
    const content = [header, ...rows].map(headerLine).join('\n') + '\n';

    mkdirSync(dirname(path), { recursive: true });
    const tempPath = `${path}.${randomBytes(6).toString('hex')}.tmp`;
    try {
        writeFileSync(tempPath, content, 'utf8');
        renameSync(tempPath, path);
    } finally {
        rmSync(tempPath, { force: true });
    }
}
