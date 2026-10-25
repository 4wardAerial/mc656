import { parseSessionType } from '../domain/session-type.js';
import {
    User,
    type VoterProfile,
    assertValidUserId,
    formatAttribute,
    parseAttribute
} from '../domain/user.js';
import { VotingController } from '../domain/voting-controller.js';
import { type CsvRow, createCsvTableIfMissing, readCsvTable, writeCsvTable } from '../infrastructure/csv-table.js';
import { hashPassword, isPasswordHash, verifyPassword } from '../infrastructure/password-hasher.js';

export const VOTER_TABLE_HEADER: CsvRow = ['id', 'hashedPassword', 'sessionType', 'attribute'];
export const ADMIN_TABLE_HEADER: CsvRow = ['id', 'hashedPassword'];

/** Same error for unknown id and wrong password, so login does not reveal which ids exist. */
export class InvalidCredentialsError extends Error {
    constructor() {
        super('Invalid id or password.');
        this.name = 'InvalidCredentialsError';
    }
}

interface VoterRecord {
    readonly hashedPassword: string;
    readonly profile: VoterProfile;
}

/**
 * Handles signup, login and deletion of users, backed by two CSV tables:
 * `voterTable` (id, hashedPassword, sessionType, attribute) and `adminTable` (id, hashedPassword).
 *
 * Both tables are read once, on construction, and rewritten after every change, so the files
 * are always the source of truth (the controller holds no other state and is not serialized).
 * Missing tables are created empty; malformed tables make the constructor fail with the
 * offending line instead of silently skipping data.
 */
export class UserController {
    private voters: ReadonlyMap<string, VoterRecord>;
    private admins: ReadonlyMap<string, string>;

    constructor(
        private readonly voterTablePath: string,
        private readonly adminTablePath: string,
        private readonly votingController: VotingController
    ) {
        this.voters = loadTable(voterTablePath, VOTER_TABLE_HEADER, parseVoterRow);
        this.admins = loadTable(adminTablePath, ADMIN_TABLE_HEADER, parseAdminRow);
    }

    signup(id: string, password: string, isAdmin: true): void;
    signup(id: string, password: string, isAdmin: false, profile: VoterProfile): void;
    signup(id: string, password: string, isAdmin: boolean, profile?: VoterProfile): void {
        if (isAdmin) {
            if (profile !== undefined) {
                throw new Error('Administrators do not have a session type or attribute.');
            }
            User.admin(id); // validates the id
            this.assertIdIsFree(this.admins, id, 'administrator');
            this.saveAdmins(withEntry(this.admins, id, hashPassword(password)));
            return;
        }
        if (profile === undefined) {
            throw new Error('A voter requires a session type and an attribute.');
        }
        User.voter(id, profile); // validates the id and that the attribute matches the session type
        this.assertIdIsFree(this.voters, id, 'voter');
        this.saveVoters(withEntry(this.voters, id, { hashedPassword: hashPassword(password), profile }));
    }

    /** Returns the authenticated user, with the attribute typed according to its session type. */
    login(id: string, password: string, isAdmin: boolean): User {
        if (isAdmin) {
            const hashedPassword = this.admins.get(id);
            if (hashedPassword === undefined || !verifyPassword(password, hashedPassword)) {
                throw new InvalidCredentialsError();
            }
            return User.admin(id);
        }
        const voter = this.voters.get(id);
        if (voter === undefined || !verifyPassword(password, voter.hashedPassword)) {
            throw new InvalidCredentialsError();
        }
        return User.voter(id, voter.profile);
    }

    deleteUser(id: string, isAdmin: boolean): void {
        if (isAdmin) {
            this.assertIdExists(this.admins, id, 'administrator');
            
            const adminUser = User.admin(id);
            this.votingController.verifyAdminNotLinked(adminUser);
            this.saveAdmins(withoutEntry(this.admins, id));
            return;
        }
        this.assertIdExists(this.voters, id, 'voter');
        this.saveVoters(withoutEntry(this.voters, id));
    }

    // -=-=-=-=-=-=-=-=-=- Persistence -=-=-=-=-=-=-=-=-=-
    // The file is written before the in-memory state changes: if writing fails,
    // memory and file stay consistent.

    private saveVoters(next: ReadonlyMap<string, VoterRecord>): void {
        const rows = [...next].map(([id, { hashedPassword, profile }]) =>
            [id, hashedPassword, profile.sessionType, formatAttribute(profile.attribute)]);
        writeCsvTable(this.voterTablePath, VOTER_TABLE_HEADER, rows);
        this.voters = next;
    }

    private saveAdmins(next: ReadonlyMap<string, string>): void {
        const rows = [...next].map(([id, hashedPassword]) => [id, hashedPassword]);
        writeCsvTable(this.adminTablePath, ADMIN_TABLE_HEADER, rows);
        this.admins = next;
    }

    private assertIdIsFree(table: ReadonlyMap<string, unknown>, id: string, role: string): void {
        if (table.has(id)) {
            throw new Error(`Another ${role} already uses id "${id}".`);
        }
    }

    private assertIdExists(table: ReadonlyMap<string, unknown>, id: string, role: string): void {
        if (!table.has(id)) {
            throw new Error(`No ${role} with id "${id}".`);
        }
    }
}

// -=-=-=-=-=-=-=-=-=- Table loading -=-=-=-=-=-=-=-=-=-

function loadTable<T>(path: string, header: CsvRow, parseRow: (row: string[]) => [string, T]): Map<string, T> {
    createCsvTableIfMissing(path, header);
    const entries = new Map<string, T>();
    readCsvTable(path, header).forEach((row, index) => {
        try {
            const [id, value] = parseRow(row);
            if (entries.has(id)) {
                throw new Error(`duplicated id "${id}"`);
            }
            entries.set(id, value);
        } catch (error) {
            throw new Error(`Invalid row at ${path}:${index + 2}: ${(error as Error).message}`, { cause: error });
        }
    });
    return entries;
}

function parseAdminRow([id = '', hashedPassword = '']: string[]): [string, string] {
    assertValidUserId(id);
    assertPasswordHash(hashedPassword);
    return [id, hashedPassword];
}

function parseVoterRow([id = '', hashedPassword = '', sessionType = '', attribute = '']: string[]): [string, VoterRecord] {
    assertValidUserId(id);
    assertPasswordHash(hashedPassword);
    const type = parseSessionType(sessionType);
    return [id, { hashedPassword, profile: { sessionType: type, attribute: parseAttribute(type, attribute) } }];
}

function assertPasswordHash(value: string): void {
    if (!isPasswordHash(value)) {
        throw new Error('hashedPassword is not a valid password hash');
    }
}

function withEntry<T>(map: ReadonlyMap<string, T>, key: string, value: T): Map<string, T> {
    return new Map(map).set(key, value);
}

function withoutEntry<T>(map: ReadonlyMap<string, T>, key: string): Map<string, T> {
    const next = new Map(map);
    next.delete(key);
    return next;
}
