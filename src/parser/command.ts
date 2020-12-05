import { OptionDefinition, OptionDefinitionList } from './option';

/**
 * An enum for different types of CommandDefinitions.
 */
export const enum CommandType {
    ISOLATED = 'ISOLATED',
    SHARED = 'SHARED'
}

/**
 * A CommandHandler is the actual function which is executed when a command is run.
 */
export interface CommandHandler<T extends OptionDefinitionList> {
    (parser: CommandParser<T>): Promise<void> | void;
}

/**
 * The common fields of a CommandDefinition.
 *
 * @description
 * This interface is used internally only and extended by exported CommandDefinitions.
 *
 * @internal
 */
interface BaseCommandDefinition<T extends OptionDefinitionList> {
    type: CommandType;
    handler: CommandHandler<T>;
    name: string;
    alias?: string | string[];
    short?: string | string[];
    description?: string;
    asFlag?: boolean;
}

/**
 * A SharedCommandDefinition describes a command which uses the same CommandParser
 * instance as its parent command.
 */
export interface SharedCommandDefinition<T extends OptionDefinitionList> extends BaseCommandDefinition<T> {
    type: CommandType.SHARED;
    commands?: CommandDefinitionList<T>;
}

/**
 * An IsolatedCommandDefinition describes a command which uses its own instance of
 * a CommandParser.
 */
export interface IsolatedCommandDefinition<T extends OptionDefinitionList> extends BaseCommandDefinition<T> {
    type: CommandType.ISOLATED;
    options?: T;
    commands?: CommandDefinitionList<T> | BuiltinCommandDefinitionList;
}

/**
 * A CommandDefinition describes a command for the CommandParser.
 */
export type CommandDefinition<T extends OptionDefinitionList> = IsolatedCommandDefinition<T> | SharedCommandDefinition<T>;

/**
 * A CommandDefinitionList is a record of SharedCommandDefinitions with the
 * record's keys corresponding to each command's name property.
 */
export interface CommandDefinitionList<T extends OptionDefinitionList> {
    [key: string]: SharedCommandDefinition<T>;
}

/**
 * A BuiltinCommandDefinitionList is a CommandDefinitionList with two optional
 * CommandDefintions for a `help` and a `version` command.
 *
 * @description
 * Each Command will have a `help` and `version` command by default. These can
 * be customized by defining your own SharedCommandDefinitions or disabled by
 * setting the appropriate key to `null`.
 */
export interface BuiltinCommandDefinitionList {
    help?: SharedCommandDefinition<OptionDefinitionList> | null;
    version?: SharedCommandDefinition<OptionDefinitionList> | null;
}

/**
 * A CommandConfig is the configuration type derived from a CommandDefinition's
 * OptionDefinitionList.
 */
export type CommandConfig<T extends OptionDefinitionList> = {
    [P in keyof T]: T[P] extends OptionDefinition<infer R> ? R : unknown;
};

/**
 * A CommandParser provides access to the parsing result of a CommandDefinition
 * inside the command's CommandHandler.
 *
 * @remarks
 * The CliParser class implements the CommandParser interface. We don't want to
 * directly depend on the CliParser class to prevent cyclic dependencies.
 */
export interface CommandParser<T extends OptionDefinitionList> {

    definition: IsolatedCommandDefinition<T>;

    arguments (): string[];

    options (): Partial<CommandConfig<T>>;

    config (): CommandConfig<T>;
}

/**
 * A helper function that infers the sub-type of the created CommandDefinition and provides editor
 * support (code completion) without having to explicitly declare the type of the CommandDefinition.
 *
 * @example
 * ```typescript
 * const myOptions = options({
 *     foo: {
 *         parse: BOOLEAN,
 *         default: false,
 *     },
 *     bar: {
 *         parse: STRING,
 *     },
 * });
 *
 * // the command helper will infer the correct CommandDefinition sub-type
 * // and provide type-checking and code completion support in editors
 * const myCommand2 = command({
 *     name: 'myCommand',
 *     type: CommandType.ISOLATED,
 *     options: myOptions,
 *     handler: (command) => {
 *         const config = command.config();
 *         if (config.foo) console.log(config.bar);
 *     },
 * });
 *
 * // alternatively a command can be typed explicitly, but it's rather verbose...
 * const myCommand1: IsolatedCommandDefinition<typeof myOptions> = {
 *     name: 'myCommand',
 *     type: CommandType.ISOLATED,
 *     options: myOptions,
 *     handler: (command) => {
 *         const config = command.config();
 *         if (config.foo) console.log(config.bar);
 *     },
 * };
 * ```
 * @param command - The command definition object
 */
export function command<T extends OptionDefinitionList> (command: SharedCommandDefinition<T>): SharedCommandDefinition<T>;
export function command<T extends OptionDefinitionList> (command: IsolatedCommandDefinition<T>): IsolatedCommandDefinition<T>;
export function command<T extends OptionDefinitionList> (command: CommandDefinition<T>): CommandDefinition<T> {

    return { ...command };
}
