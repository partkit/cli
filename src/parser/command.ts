import { ArgumentConfig, ArgumentDefinitionList } from './argument';
import { OptionConfig, OptionDefinitionList } from './option';

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
export interface CommandHandler<O extends OptionDefinitionList, A extends ArgumentDefinitionList> {
    (parser: CommandParser<O, A>): Promise<void> | void;
}

/**
 * The common fields of a CommandDefinition.
 *
 * @description
 * This interface is used internally only and extended by exported CommandDefinitions.
 *
 * @internal
 */
interface BaseCommandDefinition<O extends OptionDefinitionList, A extends ArgumentDefinitionList> {
    type: CommandType;
    handler: CommandHandler<O, A>;
    name?: string;
    alias?: string | string[];
    short?: string | string[];
    description?: string;
    asFlag?: boolean;
}

/**
 * A SharedCommandDefinition describes a command which uses the same CommandParser
 * instance as its parent command.
 */
export interface SharedCommandDefinition<
    O extends OptionDefinitionList = OptionDefinitionList,
    A extends ArgumentDefinitionList = ArgumentDefinitionList
> extends BaseCommandDefinition<O, A> {
    type: CommandType.SHARED;
    commands?: CommandDefinitionList<O, A>;
}

/**
 * An IsolatedCommandDefinition describes a command which uses its own instance of
 * a CommandParser.
 */
export interface IsolatedCommandDefinition<
    O extends OptionDefinitionList = OptionDefinitionList,
    A extends ArgumentDefinitionList = ArgumentDefinitionList
> extends BaseCommandDefinition<O, A> {
    type: CommandType.ISOLATED;
    name: string;
    options?: O;
    arguments?: A,
    commands?: CommandDefinitionList<O, A> | BuiltinCommandDefinitionList;
}

/**
 * A CommandDefinition describes a command for the CommandParser.
 */
export type CommandDefinition<
    O extends OptionDefinitionList = OptionDefinitionList,
    A extends ArgumentDefinitionList = ArgumentDefinitionList
> = IsolatedCommandDefinition<O, A> | SharedCommandDefinition<O, A>;

/**
 * A CommandDefinitionList is a record of SharedCommandDefinitions with the
 * record's keys corresponding to each command's name property.
 */
export interface CommandDefinitionList<O extends OptionDefinitionList, A extends ArgumentDefinitionList> {
    [key: string]: SharedCommandDefinition<O, A>;
}

/**
 * A Command is a runtime description of a command for the CommandParser.
 *
 * @remarks
 * A Command will always have a name.
 */
export type Command<
    O extends OptionDefinitionList = OptionDefinitionList,
    A extends ArgumentDefinitionList = ArgumentDefinitionList
> = IsolatedCommandDefinition<O, A> | (SharedCommandDefinition<O, A> & { name: string; });

export const HELP_COMMAND_NAME = 'help';

export const VERSION_COMMAND_NAME = 'version';

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
    [HELP_COMMAND_NAME]?: SharedCommandDefinition | null;
    [VERSION_COMMAND_NAME]?: SharedCommandDefinition | null;
}

/**
 * A CommandParser provides access to the parsing result of a CommandDefinition
 * inside the command's CommandHandler.
 *
 * @remarks
 * The CliParser class implements the CommandParser interface. We don't want to
 * directly depend on the CliParser class to prevent cyclic dependencies.
 */
export interface CommandParser<O extends OptionDefinitionList, A extends ArgumentDefinitionList = ArgumentDefinitionList> {

    definition: IsolatedCommandDefinition<O, A>;

    arguments (): Partial<ArgumentConfig<A>>;

    options (): Partial<OptionConfig<O>>;

    config (): OptionConfig<O>;
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
export function command<O extends OptionDefinitionList, A extends ArgumentDefinitionList> (command: SharedCommandDefinition<O, A>): SharedCommandDefinition<O, A>;
export function command<O extends OptionDefinitionList, A extends ArgumentDefinitionList> (command: IsolatedCommandDefinition<O, A>): IsolatedCommandDefinition<O, A>;
export function command<O extends OptionDefinitionList, A extends ArgumentDefinitionList> (command: CommandDefinition<O, A>): CommandDefinition<O, A> {

    return { ...command };
}
