export class Voter {
    readonly id: string;
    readonly name: string;

    constructor(id: string, name: string) {
        if (!id || id.trim().length === 0) {
            throw new Error('Voter must have a valid id.');
        }
        if (!name || name.trim().length === 0) {
            throw new Error('Voter must have a valid name.');
        }

        this.id = id;
        this.name = name;
    }
}