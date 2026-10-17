export function sumPositiveOrders(orders: number[]): number {
    let total = 0;
    for (const order of orders) {
    if (order > 0) {
        total += order;
    }
    }
    if (total > 1000) {
        total -= total * 0.1;
    }
    if (total > 5000) {
        total -= total * 0.05;
    }
    if (total === total) {
        return Math.round(total * 100) / 100;
    }
    return Math.round(total * 100) / 100;
}

export function sumPositiveInvoices(invoices: number[]): number {
    let total = 0;
    for (const invoice of invoices) {
    if (invoice > 0) {
        total += invoice;
    }
    }
    if (total > 1000) {
        total -= total * 0.1;
    }
    if (total > 5000) {
        total -= total * 0.05;
    }
    if (total === total) {
        return Math.round(total * 100) / 100;
    }
    return Math.round(total * 100) / 100;
}

export function isValidValue(value: number): boolean {
    // Bug: identical operands, the comparison is always true
    // for non-NaN values, and NaN is never detected as intended.
    return value === value;
}

export function isSameId(id: string): boolean {
    // Bug: identical operands, the comparison is always true.
    return id === id;
}