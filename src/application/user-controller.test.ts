import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionType } from '../domain/session-type.js';
import type { VoterProfile } from '../domain/user.js';
import { hashPassword } from '../infrastructure/password-hasher.js';
import { InvalidCredentialsError, UserController } from './user-controller.js';
import { VotingController } from '../domain/voting-controller.js';

const CONCLAVE: VoterProfile = { sessionType: SessionType.CONCLAVE, attribute: null };
const ONU_PERMANENT: VoterProfile = { sessionType: SessionType.ONU, attribute: true };
const CONDO_4_2: VoterProfile = { sessionType: SessionType.CONDOMINIUM, attribute: 4.2 };

describe('UserController', () => {
    let dir: string;
    let voterTable: string;
    let adminTable: string;
    let votingController: VotingController;

    const newController = (): UserController => new UserController(voterTable, adminTable, votingController);
    const readTables = (): string => readFileSync(voterTable, 'utf8') + readFileSync(adminTable, 'utf8');

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'user-controller-'));
        voterTable = join(dir, 'voters.csv');
        adminTable = join(dir, 'admins.csv');
        votingController = new VotingController();
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    describe('loading the tables', () => {
        it('creates both tables with their headers when they do not exist yet', () => {
            newController();

            expect(readFileSync(voterTable, 'utf8')).toBe('id,hashedPassword,sessionType,attribute\n');
            expect(readFileSync(adminTable, 'utf8')).toBe('id,hashedPassword\n');
        });

        it('shapes the attribute of each logged-in voter according to its session type', () => {
            const hash = hashPassword('pw');
            writeFileSync(voterTable, [
                'id,hashedPassword,sessionType,attribute',
                `id1,${hash},CONCLAVE,None`,
                `id2,${hash},ONU,true`,
                `id3,${hash},CONDOMINIUM,4.2`,
                `idN,${hash},ONU,false`
            ].join('\n'));
            const controller = newController();

            const expected: [string, SessionType, unknown][] = [
                ['id1', SessionType.CONCLAVE, null],
                ['id2', SessionType.ONU, true],
                ['id3', SessionType.CONDOMINIUM, 4.2],
                ['idN', SessionType.ONU, false]
            ];
            for (const [id, sessionType, attribute] of expected) {
                const user = controller.login(id, 'pw', false);
                expect(user.isAdmin).toBe(false);
                expect(user.sessionType).toBe(sessionType);
                expect(user.attribute).toBe(attribute);
            }
        });

        const corruptedVoterRows: [string, string][] = [
            ['unknown session type', 'v2,HASH,PARLIAMENT,None'],
            ['ONU attribute that is not a boolean', 'v2,HASH,ONU,yes'],
            ['ideal fraction of zero', 'v2,HASH,CONDOMINIUM,0'],
            ['CONCLAVE voter with an attribute', 'v2,HASH,CONCLAVE,4.2'],
            ['plaintext password', 'v2,hunter2,ONU,true'],
            ['empty id', ',HASH,ONU,true'],
            ['duplicated id', 'v1,HASH,ONU,true']
        ];

        for (const [problem, row] of corruptedVoterRows) {
            it(`refuses to start when the voter table has a ${problem}, pointing at the line`, () => {
                const hash = hashPassword('pw');
                writeFileSync(voterTable, [
                    'id,hashedPassword,sessionType,attribute',
                    `v1,${hash},CONCLAVE,None`,
                    row.replace('HASH', hash)
                ].join('\n'));

                expect(() => newController()).toThrow(`Invalid row at ${voterTable}:3`);
            });
        }

        it('refuses to start when the admin table holds something that is not a password hash', () => {
            writeFileSync(adminTable, 'id,hashedPassword\nadmin1,hunter2\n');

            expect(() => newController()).toThrow(`Invalid row at ${adminTable}:2: hashedPassword is not a valid password hash`);
        });
    });

    describe('signup', () => {
        it('persists the voter so it can log in after the application restarts', () => {
            newController().signup('id3', 'pw', false, CONDO_4_2);

            const user = newController().login('id3', 'pw', false);
            expect(user.sessionType).toBe(SessionType.CONDOMINIUM);
            expect(user.attribute).toBe(4.2);
        });

        it('writes the row in the agreed format, storing a salted hash instead of the password', () => {
            const controller = newController();
            controller.signup('id2', 'same password', false, ONU_PERMANENT);
            controller.signup('id3', 'same password', false, CONDO_4_2);

            const [header, onuRow = '', condoRow = ''] = readFileSync(voterTable, 'utf8').trimEnd().split('\n');
            expect(header).toBe('id,hashedPassword,sessionType,attribute');
            expect(onuRow).toMatch(/^id2,scrypt\$[0-9a-f]+\$[0-9a-f]+,ONU,true$/);
            expect(condoRow).toMatch(/^id3,scrypt\$[0-9a-f]+\$[0-9a-f]+,CONDOMINIUM,4\.2$/);
            expect(readTables()).not.toContain('same password');
            expect(onuRow.split(',')[1]).not.toBe(condoRow.split(',')[1]);
        });

        it('accepts passwords containing CSV separators', () => {
            newController().signup('admin1', 'a,"b"\nc', true);

            expect(newController().login('admin1', 'a,"b"\nc', true).id).toBe('admin1');
        });

        it('rejects a duplicated id in the same table without touching the files', () => {
            const controller = newController();
            controller.signup('id1', 'pw', false, CONCLAVE);
            controller.signup('admin1', 'pw', true);
            const before = readTables();

            expect(() => controller.signup('id1', 'other', false, ONU_PERMANENT)).toThrow('Another voter already uses id "id1".');
            expect(() => controller.signup('admin1', 'other', true)).toThrow('Another administrator already uses id "admin1".');
            expect(readTables()).toBe(before);
            expect(controller.login('id1', 'pw', false).sessionType).toBe(SessionType.CONCLAVE);
            expect(controller.login('admin1', 'pw', true).id).toBe('admin1');
        });

        it('keeps voters and administrators in separate tables, so the same id can exist in both', () => {
            const controller = newController();
            controller.signup('ana', 'voter-pw', false, CONCLAVE);
            controller.signup('ana', 'admin-pw', true);

            expect(controller.login('ana', 'voter-pw', false).isAdmin).toBe(false);
            expect(controller.login('ana', 'admin-pw', true).isAdmin).toBe(true);
            expect(() => controller.login('ana', 'voter-pw', true)).toThrow(InvalidCredentialsError);
        });

        it('rejects invalid voter data without writing anything', () => {
            const controller = newController();
            const before = readTables();
            const invalidSignups: (() => void)[] = [
                () => controller.signup('v1', 'pw', false, { sessionType: SessionType.ONU, attribute: 1 }),
                () => controller.signup('v1', 'pw', false, { sessionType: SessionType.CONDOMINIUM, attribute: 0 }),
                () => controller.signup('v1', 'pw', false, { sessionType: SessionType.CONCLAVE, attribute: false }),
                () => controller.signup('v1', '', false, CONCLAVE),
                () => controller.signup('v,1', 'pw', false, CONCLAVE),
                () => controller.signup('a,1', 'pw', true),
                () => controller.signup(' a1', 'pw', true),
                () => controller.signup('a1', '', true)
            ];

            for (const signup of invalidSignups) {
                expect(signup).toThrow();
            }
            expect(readTables()).toBe(before);
        });

        it('rejects inconsistent role data coming from untyped callers (e.g. the UI layer)', () => {
            const controller = newController();
            const untyped = controller.signup.bind(controller) as (...args: unknown[]) => void;

            expect(() => untyped('a1', 'pw', true, CONCLAVE)).toThrow('Administrators do not have a session type or attribute.');
            expect(() => untyped('v1', 'pw', false)).toThrow('A voter requires a session type and an attribute.');
        });
    });

    describe('login', () => {
        it('returns administrators without session type or attribute', () => {
            const controller = newController();
            controller.signup('admin1', 'pw', true);

            const admin = controller.login('admin1', 'pw', true);
            expect(admin.isAdmin).toBe(true);
            expect(admin.sessionType).toBeNull();
            expect(admin.attribute).toBeNull();
        });

        it('gives the same error for a wrong password, an unknown id or the wrong table', () => {
            const controller = newController();
            controller.signup('id1', 'pw', false, CONCLAVE);
            const attempts: (() => unknown)[] = [
                () => controller.login('id1', 'wrong', false),
                () => controller.login('nobody', 'pw', false),
                () => controller.login('id1', 'pw', true)
            ];

            for (const attempt of attempts) {
                expect(attempt).toThrow(InvalidCredentialsError);
                expect(attempt).toThrow('Invalid id or password.');
            }
        });
    });

    describe('deleteUser', () => {
        it('removes the user from the table for good, keeping everyone else', () => {
            const controller = newController();
            controller.signup('id1', 'pw', false, CONCLAVE);
            controller.signup('id2', 'pw', false, ONU_PERMANENT);

            controller.deleteUser('id1', false);

            expect(() => controller.login('id1', 'pw', false)).toThrow(InvalidCredentialsError);
            const restarted = newController();
            expect(() => restarted.login('id1', 'pw', false)).toThrow(InvalidCredentialsError);
            expect(restarted.login('id2', 'pw', false).attribute).toBe(true);
            expect(readFileSync(voterTable, 'utf8')).not.toContain('id1,');
        });

        it('only touches the table selected by isAdmin', () => {
            const controller = newController();
            controller.signup('ana', 'pw', false, CONCLAVE);
            controller.signup('ana', 'pw', true);

            controller.deleteUser('ana', true);

            expect(() => controller.login('ana', 'pw', true)).toThrow(InvalidCredentialsError);
            expect(newController().login('ana', 'pw', false).id).toBe('ana');
        });

        it('fails for an unknown id without touching the files', () => {
            const controller = newController();
            controller.signup('id1', 'pw', false, CONCLAVE);
            const before = readTables();

            expect(() => controller.deleteUser('nobody', false)).toThrow('No voter with id "nobody".');
            expect(() => controller.deleteUser('id1', true)).toThrow('No administrator with id "id1".');
            expect(readTables()).toBe(before);
        });

        it('allows signing up again with a deleted id', () => {
            const controller = newController();
            controller.signup('id1', 'old', false, CONCLAVE);
            controller.deleteUser('id1', false);

            controller.signup('id1', 'new', false, CONDO_4_2);

            expect(newController().login('id1', 'new', false).attribute).toBe(4.2);
        });

        it('prevents deleting an administrator who is linked to active voting sessions', () => {
            const controller = newController();
            controller.signup('admin1', 'pw', true);
            const adminUser = controller.login('admin1', 'pw', true);

            votingController.createSession(adminUser, SessionType.CONCLAVE, 'sess-1');

            expect(() => controller.deleteUser('admin1', true)).toThrow(
                "Admin can't be deleted: First delete all voting sessions that they still own."
            );
            expect(controller.login('admin1', 'pw', true).id).toBe('admin1');
        });
    });

    it('leaves only the two tables in the folder after a sequence of changes', () => {
        const controller = newController();
        controller.signup('id1', 'pw', false, CONCLAVE);
        controller.signup('admin1', 'pw', true);
        controller.deleteUser('id1', false);

        expect(readdirSync(dir).sort()).toEqual(['admins.csv', 'voters.csv']);
    });
});