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
export function options<T extends OptionDefinitionList> (options: T): T {

    return { ...options };
}
