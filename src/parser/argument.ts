import { TypeParser } from './type-parser';

export interface ArgumentDefinition<T = unknown> {
    parse: TypeParser<T>,
    name?: string;
    default?: T;
    required?: boolean;
}

export type ArgumentDefinitionList = ArgumentDefinition[];

/**
 * ArgumentConfig is the configuration type derived from an ArgumentDefinitionList.
 *
 * @description
 * The derived type is a mapped tuple type with the order of the original ArgumentDefinitionList,
 * but the type of each tuple element is the value type `T` of the original ArgumentDefinition<T>.
 */
export type ArgumentConfig<T extends ArgumentDefinitionList> = {
    [P in keyof T]: T[P] extends ArgumentDefinition<infer R> ? R : unknown;
};

export interface Argument<T = unknown> extends ArgumentDefinition<T> {
    value?: T;
}

/**
 * A helper function that infers the type of the created ArgumentDefinitionList and provides editor
 * support (code completion) without having to explicitly declare the type of the ArgumentDefinitionList.
 *
 * @remarks
 * By providing each argument definition as deparate argument, TypeScript can infer a mapped tuple type
 * and preserve the inferred type of each ArgumentDefinition and its position in the tuple.
 *
 * @param args - The argument definitions
 */
export const args = <T extends ArgumentDefinitionList> (...args: T): T => {

    return args;
};
