import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionType } from './domain/session-type.js';
import { InvalidCredentialsError } from './application/user-controller.js';
import { type App, createApp } from './main.js';

describe('App (main)', () => {
    let dir: string;
    let app: App;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'app-'));
        app = createApp({ voterTablePath: join(dir, 'voters.csv'), adminTablePath: join(dir, 'admins.csv') });
        app.userController.signup('voter1', 'pw1', false, { sessionType: SessionType.ONU, attribute: true });
        app.userController.signup('voter2', 'pw2', false, { sessionType: SessionType.CONCLAVE, attribute: null });
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    it('starts with nobody logged in', () => {
        expect(app.getCurrentUser()).toBeNull();
    });

    it('replaces the current user with the one returned by a successful login', () => {
        app.login('voter1', 'pw1', false);
        const second = app.login('voter2', 'pw2', false);

        expect(app.getCurrentUser()).toBe(second);
        expect(second.id).toBe('voter2');
        expect(second.sessionType).toBe(SessionType.CONCLAVE);
    });

    it('logs the previous user out when the next login fails (shared device)', () => {
        app.login('voter1', 'pw1', false);

        expect(() => app.login('voter2', 'wrong', false)).toThrow(InvalidCredentialsError);
        expect(app.getCurrentUser()).toBeNull();
    });

    it('logs the current user out', () => {
        app.login('voter1', 'pw1', false);
        app.logout();

        expect(app.getCurrentUser()).toBeNull();
    });
});
