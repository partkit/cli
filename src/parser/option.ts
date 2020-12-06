import { TypeParser } from './type-parser';

export interface OptionDefinition<T = unknown> {
    alias?: string | string[];
    short?: string | string[];
    description?: string;
    parse: TypeParser<T>;
    default?: T;
    required?: boolean;
    hidden?: boolean;
    hiddenName?: boolean;
    noNegation?: boolean,
}

export interface OptionDefinitionList {
    [key: string]: OptionDefinition;
}

/**
 * OptionConfig is the configuration type derived from an OptionDefinitionList.
 *
 * @description
 * The derived type is a mapped object type with the keys of the original OptionDefinitionList,
 * but the type of each key is the value type `T` of the original OptionDefinition<T>.
 */
export type OptionConfig<O extends OptionDefinitionList> = {
    [P in keyof O]: O[P] extends OptionDefinition<infer R> ? R : unknown;
};

export interface Option<T = unknown> extends OptionDefinition<T> {
    name: string;
    value?: T;
}

/**
 * A helper function that infers the type of the created OptionDefinitionList and provides editor
 * support (code completion) without having to explicitly declare the type of the OptionDefinitionList.
 *
 * @param options - The option definition list object
 */
export function opts<T extends OptionDefinitionList> (options: T): T {

    return { ...options };
}
