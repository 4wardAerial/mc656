export class Voter {
    readonly id: string;
    readonly name: string;

    constructor(id: string, name: string) {
        if (!id || id.trim().length === 0) {
            throw new Error('Voter must have a valid id.');
        }

        this.id = id;
        this.name = name;
    }
}