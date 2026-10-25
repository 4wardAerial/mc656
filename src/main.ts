import { UserController } from './application/user-controller.js';
import type { User } from './domain/user.js';
import { VotingController } from './domain/voting-controller.js';

export interface AppConfig {
    readonly voterTablePath: string;
    readonly adminTablePath: string;
}

export const DEFAULT_CONFIG: AppConfig = {
    voterTablePath: 'data/voters.csv',
    adminTablePath: 'data/admins.csv'
};

/**
 * Composition root: owns the single `UserController` and the user currently using the shared
 * device. `login` replaces the current user; on a shared terminal the previous user is always
 * logged out first, so a failed attempt never leaves someone else's session active.
 */
export class App {
    private currentUser: User | null = null;

    constructor(
        public readonly userController: UserController,
        public readonly votingController: VotingController
    ) {}

    login(id: string, password: string, isAdmin: boolean): User {
        this.currentUser = null;
        this.currentUser = this.userController.login(id, password, isAdmin);
        return this.currentUser;
    }

    logout(): void {
        this.currentUser = null;
    }

    getCurrentUser(): User | null {
        return this.currentUser;
    }
}

export function createApp(config: AppConfig = DEFAULT_CONFIG): App {
    const votingController = new VotingController();
    const userController = new UserController(
        config.voterTablePath,
        config.adminTablePath,
        votingController
    );

    return new App(userController, votingController);
}
