export class Administrator {
    readonly id: string;

    constructor(id: string) {
        if (!id || id.trim().length === 0) {
            throw new Error('Administrator must have a valid id.');
        }

        this.id = id;
    }
}
