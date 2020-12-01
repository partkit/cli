// TODO: we might actually not need `merge`
export const merge = <
    T extends { [key: string]: unknown; },
    U extends { [key: string]: unknown; },
    R extends { [P in Exclude<keyof T, keyof U>]: T[P] } & U> (a: T, b: U): R => {

    return {
        ...a,
        ...b,
    } as unknown as R;
};

export const coerceArray = <T> (value?: T | T[]): T[] => Array.isArray(value)
    ? value
    : value !== undefined
        ? [value]
        : [];
