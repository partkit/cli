export type TypeParserFunction<T> = (value: string | undefined) => T | undefined;

export type TypeParser<T> = TypeParserFunction<T> & {
    hint: string;
};

export const createTypeParser = <T extends unknown> (parser: TypeParserFunction<T>, hint: string): TypeParser<T> => {

    (parser as TypeParser<T>).hint = hint;

    return parser as TypeParser<T>;
};

export const isEmpty = (value: string | undefined): value is undefined => (value === undefined || value === '');

export const STRING = createTypeParser<string>(
    (value) => isEmpty(value) ? undefined : value,
    'string',
);

export const NUMBER = createTypeParser<number>(
    (value) => isEmpty(value) ? undefined : parseFloat(value),
    'number',
);

export const BOOLEAN = createTypeParser<boolean>(
    (value) => (value === undefined || value === 'false') ? false : true,
    'boolean',
);

export const ARRAY = <T extends unknown> (parser: TypeParser<T>): TypeParser<Exclude<T, undefined>[]> => {

    return createTypeParser<Exclude<T, undefined>[]>(
        (value) => {

            return isEmpty(value)
                ? undefined
                : value.split(',')
                    .map(val => parser(val))
                    .filter(val => val !== undefined) as Exclude<T, undefined>[];
        },
        `${ parser.hint }[]`,
    );
};
