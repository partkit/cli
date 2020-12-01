export type TypeParserFunction<T> = (value: string | undefined) => T | undefined;

export type TypeParser<T> = TypeParserFunction<T> & {
    hint: string;
};

export const createTypeParser = <T extends unknown> (parser: TypeParserFunction<T>, hint: string): TypeParser<T> => {

    (parser as TypeParser<T>).hint = hint;

    return parser as TypeParser<T>;
};

export const STRING = createTypeParser<string>(
    (value) => value,
    'string',
);

export const NUMBER = createTypeParser<number>(
    (value) => (value === '' || value === undefined) ? undefined : parseFloat(value),
    'number',
);

export const BOOLEAN = createTypeParser<boolean>(
    (value) => (value !== 'false' && value !== undefined) ? true : false,
    'boolean',
);
