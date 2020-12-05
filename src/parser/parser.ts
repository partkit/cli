/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { coerceArray } from '../utils';
import {
    BuiltinCommandDefinitionList,
    Command,
    CommandConfig,
    CommandDefinition,
    CommandDefinitionList,
    CommandParser,
    CommandType,
    IsolatedCommandDefinition,
} from './command';
import { HELP_COMMAND, HELP_COMMAND_NAME } from './commands/help';
import { VERSION_COMMAND, VERSION_COMMAND_NAME } from './commands/version';
import {
    CONFLICTING_COMMAND,
    CONFLICTING_OPTION,
    DUPLICATE_COMMAND,
    DUPLICATE_OPTION,
    DUPLICATE_PARSER,
    INVALID_COMMAND,
    INVALID_OPTION,
    INVALID_USAGE,
    ParserError,
    SilentError,
} from './errors';
import { isFlag, isNegatedFlag, LONG_FLAG_PREFIX, LONG_FLAG_REGEXP, NEGATED_FLAG_PREFIX, SHORT_FLAG_PREFIX } from './flag';
import { Option, OptionDefinition, OptionDefinitionList } from './option';

// TODO: allow inferring shared command names from CommandDefinitionList

interface CliParserCommandMatch {
    name: string;
    argv: string[];
}

export interface CliParserResult<T extends OptionDefinitionList> {
    command?: CliParserCommandMatch;
    arguments?: string[];
    options?: Partial<CommandConfig<T>>;
    config?: CommandConfig<T>;
}

export const enum CliParserState {
    INITIAL = 'INITIAL',
    COMMAND = 'COMMAND',
    SHARED = 'SHARED',
    OPTION = 'OPTION',
    DONE = 'DONE',
}

export const BUILTIN_COMMANDS: BuiltinCommandDefinitionList = {
    [HELP_COMMAND_NAME]: HELP_COMMAND,
    [VERSION_COMMAND_NAME]: VERSION_COMMAND,
};

// TODO: update docs
/**
 * A CommandParser represents an instantiated CommandDefinition.
 *
 * @description
 * A CommandDefinition by itself merely describes a cli command. In order to run
 * the command and parse its respective command line arguments, a CommandParser
 * has to be instantiated with the CommandDefinition as argument.
 */
export class CliParser<T extends OptionDefinitionList> implements CommandParser<T> {

    protected _commands: Record<string, Command<OptionDefinitionList>> = {};

    protected _parsers: Record<string, CliParser<OptionDefinitionList>> = {};

    protected _options: Record<string, Option> = {};

    protected _commandLookup = new Map<string, Command<OptionDefinitionList>>();

    protected _optionLookup = new Map<string, Option<unknown>>();

    protected state: CliParserState = CliParserState.INITIAL;

    protected result: CliParserResult<T> = {};

    constructor (public definition: IsolatedCommandDefinition<T>) {

        const { options, commands } = this.definition;

        if (options) {

            this.registerOptions(options);
        }

        this.registerCommands({
            ...BUILTIN_COMMANDS,
            ...commands,
        });
    }

    /**
     * Get the parsed arguments of the command parser
     *
     * @description
     * Parsed arguments are only available once the command parser was run. Invoking
     * this method before calling {@link CommandParser.run} will result in an error.
     */
    arguments (): string[] {

        // we get the name of this method instead of using a string literal 'arguments'
        // this way we can refactor later on without having to worry about string constants
        const api = (this.constructor.prototype as CliParser<T>).arguments.name;

        if (this.state !== CliParserState.DONE) throw INVALID_USAGE(this, api);

        return this.result.arguments!;
    }

    /**
     * Get the parsed options of the command parser
     *
     * @description
     * Parsed options are only available once the command parser was run. Invoking
     * this method before calling {@link CommandParser.run} will result in an error.
     *
     * @remarks
     * The parsed options will only contain options which were actually specified
     * via the command line. To get all options (with default values for options
     * not specified via the command line) use {@link CommandParser.config}.
     */
    options (): Partial<CommandConfig<T>> {

        // we get the name of this method instead of using a string literal 'options'
        // this way we can refactor later on without having to worry about string constants
        const api = (this.constructor.prototype as CliParser<T>).options.name;

        if (this.state !== CliParserState.DONE) throw INVALID_USAGE(this, api);

        return this.result.options!;
    }

    /**
     * Get the parsed config of the command parser
     *
     * @description
     * Parsed config is only available once the command parser was run. Invoking
     * this method before calling {@link CommandParser.run} will result in an error.
     */
    config (): CommandConfig<T> {

        // we get the name of this method instead of using a string literal 'config'
        // this way we can refactor later on without having to worry about string constants
        const api = (this.constructor.prototype as CliParser<T>).config.name;

        if (this.state !== CliParserState.DONE) throw INVALID_USAGE(this, api);

        return this.result.config!;
    }

    // TODO: improve description
    /**
     * Register a nested command or command parser
     *
     * @description
     * By registering nested commands or command parsers, you can create a multi-command cli,
     * e.g. `<command> <subcommand> [someArgument] --flagA --flagB`.
     * A nested command always has it's own parser instance to allow subcommands having different
     * options than the main command.
     *
     * @param commandOrParser - The command or parser to register
     */
    nest<U extends OptionDefinitionList> (command: IsolatedCommandDefinition<U>): CliParser<T>;
    nest<U extends OptionDefinitionList> (parser: CliParser<U>): CliParser<T>;
    nest<U extends OptionDefinitionList> (commandOrParser: IsolatedCommandDefinition<U> | CliParser<U>): CliParser<T> {

        const command = (commandOrParser instanceof CliParser)
            ? commandOrParser.definition
            : commandOrParser;

        const parser = (commandOrParser instanceof CliParser)
            ? commandOrParser
            : new CliParser(commandOrParser);

        this.registerCommand(command.name, command);
        this.registerParser(parser);

        return this;
    }

    /**
     * Run the command parser
     *
     * @description
     * Running the command parser will parse the (provided) arguments array and extract any matched
     * commands, options and arguments. If a registered command is matched, that command's parser is
     * invoked. Otherwise, the remaining arguments and options are extracted and the command parser's
     * command handler is invoked.
     *
     * @param argv - The arguments array to parse. (Default: process.argv)
     */
    async run (argv?: string[]): Promise<void> {

        // if no arguments array is provided, use process.argv
        if (!argv) argv = process.argv.slice(2);

        // parse the arguments array
        try {

            const matchedCommand = this.parse(argv).command;

            if (matchedCommand) {

                // if a command was matched we get its definition
                const command = this._commands[matchedCommand.name];

                if (command.type === CommandType.SHARED) {

                    // if a shared command was matched run its handler with this parser
                    await command.handler(this as never);

                } else {

                    // if a registered command was matched get the command's parser...
                    const parser = this._parsers[matchedCommand.name];

                    // ...and run it with the updated arguments array
                    await parser.run(matchedCommand.argv);
                }

            } else {

                // otherwise run this parser's command handler
                await this.definition.handler(this);
            }

        } catch (error) {

            if (error instanceof ParserError) {

                if (this._commands[HELP_COMMAND_NAME]) {

                    this.state = CliParserState.DONE;

                    console.error(`${ error.stack! }`);

                    await this._commands[HELP_COMMAND_NAME].handler(this as never);

                    // throw a silent error which won't create any output (we already logged
                    // the error *before* the usage info) but will still cause the process
                    // to exit with an error code
                    throw new SilentError();
                }

            } else throw error;
        }
    }

    protected parse (argv: string[] = []): CliParserResult<T> {

        const last = argv.length - 1;
        const args: string[] = [];
        const options: Partial<CommandConfig<T>> = {};
        let commandMatch: CliParserCommandMatch | undefined;

        // start parsing for commands first
        this.state = CliParserState.COMMAND;

        for (let i = 0; i <= last; i++) {

            const curr = argv[i];
            const next = argv[i + 1];

            // while in command parsing state
            if (this.state === CliParserState.COMMAND || this.state === CliParserState.SHARED) {

                // take the current cli argument and check if it matches a command
                const command = this._commandLookup.get(curr);

                if (command) {

                    // when shared commands have been found already, each subsequent
                    // shared command has to be a child of the previous shared command
                    if (this.state === CliParserState.SHARED) {

                        const parentCommand = this._commands[commandMatch!.name];

                        if ((parentCommand.commands as CommandDefinitionList<OptionDefinitionList>)?.[command.name] !== command) {

                            throw INVALID_COMMAND(command.name, parentCommand.name);
                        }
                    }

                    // update the parser result with the matched command name
                    // and an updated arguments array (removing the command name)
                    commandMatch = {
                        name: command.name,
                        argv: argv.slice(i + 1),
                    };

                    // check the command type: for shared commands, we have to keep
                    // on parsing, for isolated commands, we stop at this point
                    if (command.type === CommandType.SHARED) {

                        this.state = CliParserState.SHARED;
                        continue;

                    } else {

                        // set parser state to done, as the matched command's parser
                        // will take over the rest of the parsing
                        this.state = CliParserState.DONE;
                    }

                } else {

                    // if no command was matched, we assume the current argument
                    // to be an argument or an option
                    this.state = CliParserState.OPTION;
                }
            }

            // while in options parsing state
            if (this.state === CliParserState.OPTION) {

                // check if the `curr` and `next` argument are options (flags)
                const currFlag = isFlag(curr);
                const nextFlag = isFlag(next ?? '');

                if (!currFlag) {

                    // if the `curr` argument is not an option, push it in the
                    // result's arguments array
                    args.push(curr);

                } else {

                    // if the `curr` argument is an option (a flag) retrieve it
                    // from the options lookup map
                    const option = this._optionLookup.get(curr);

                    if (!option) {

                        // if the option was not found, it's an invalid option
                        throw INVALID_OPTION(curr, this.definition.name);
                    }

                    // for negated flags (--no-<option>) we set the value to `undefined`
                    // a TypeParser should handle `undefined` values appropriately
                    const value = isNegatedFlag(curr)
                        ? undefined
                        : !nextFlag
                            ? next ?? ''
                            : '';

                    // set the option's value by invoking its type parser using
                    // the `next` argument if it is not a flag itself, otherwise
                    // use an empty string
                    option.value = option.parse(value);

                    // store the option in the result's options object
                    options[option.name as keyof T] = option.value as never;

                    // if the `next` argument was used as option value we can skip
                    // it in the next parsing iteration by incrementing `i` by `1`
                    i += !nextFlag ? 1 : 0;
                }
            }
        }

        // after parsing the arguments array create a parser result
        this.result = this.createParserResult(args, options, commandMatch);

        // the parser is now done
        this.state = CliParserState.DONE;

        return this.result;
    }

    protected createParserResult (
        args: string[],
        options: Partial<CommandConfig<T>>,
        command?: CliParserCommandMatch,
    ): CliParserResult<T> {

        return {
            command,
            arguments: args ?? [],
            options: options ?? [],
            config: {
                // merge the default option values...
                ...this.createDefaultConfig(),
                // ...and the cli provided option values
                ...options,
            },
        };
    }

    protected createDefaultConfig (): CommandConfig<T> {

        return Object.entries(this._options).reduce((config, [name, option]) => {

            config[name as keyof T] = option.default as never;

            return config;

        }, {} as CommandConfig<T>);
    }

    protected registerOptions (options: T): void {

        Object.entries(options).forEach(([name, option]) => this.registerOption(name, option));
    }

    protected registerOption<U extends unknown> (name: string, definition: OptionDefinition<U>): void {

        // TODO: maybe freeze the option object?
        // we set the option's name based on its key in the option list
        const option: Option<U> = { ...definition, name };

        if (this._options[name]) {

            throw DUPLICATE_OPTION(name, this._options[name]);
        }

        this._options[name] = option;

        if (!option.hidden) {

            let longFlags = coerceArray(option.alias);
            let shortFlags = coerceArray(option.short);

            if (!option.hiddenName) {

                longFlags = longFlags.concat(option.name);
            }

            longFlags = longFlags.map(flag => `${ LONG_FLAG_PREFIX }${ flag }`);
            shortFlags = shortFlags.map(flag => `${ SHORT_FLAG_PREFIX }${ flag }`);

            // if option negation is allowed, we automatically create a --no-<option> flag
            // for each long flag (that is, aliases and name)
            if (!option.noNegation) {

                longFlags = longFlags.concat(
                    longFlags.map(flag => flag.replace(LONG_FLAG_REGEXP, `${ NEGATED_FLAG_PREFIX }$1`)),
                );
            }

            longFlags.concat(shortFlags).forEach(flag => {

                const duplicate = this._optionLookup.get(flag);

                if (duplicate) {

                    throw DUPLICATE_OPTION(flag, duplicate);
                }

                const conflict = this._commandLookup.get(flag);

                if (conflict) {

                    throw CONFLICTING_OPTION(flag, conflict);
                }

                this._optionLookup.set(flag, option);
            });
        }
    }

    protected registerCommands (commands: CommandDefinitionList<T> | BuiltinCommandDefinitionList): void {

        Object.entries(commands).forEach(([name, command]) => {

            // BuiltinCommandDefinitionList allows `null` values for the `help` and `version` command
            if (command) { this.registerCommand(name, command); }
        });
    }

    protected registerCommand<U extends OptionDefinitionList> (name: string, definition: CommandDefinition<U>): void {

        const command: Command<U> = { ...definition, name };

        if (this._commands[name]) {

            throw DUPLICATE_COMMAND(name, this._commands[name]);
        }

        this._commands[name] = command as never;

        let longFlags = coerceArray(command.alias).concat(name);
        let shortFlags = coerceArray(command.short);

        if (command.asFlag) {

            longFlags = longFlags.map(flag => `${ LONG_FLAG_PREFIX }${ flag }`);
            shortFlags = shortFlags.map(flag => `${ SHORT_FLAG_PREFIX }${ flag }`);
        }

        longFlags.concat(shortFlags).forEach(flag => {

            const duplicate = this._commandLookup.get(flag);

            if (duplicate) {

                throw DUPLICATE_COMMAND(flag, duplicate);
            }

            const conflict = this._optionLookup.get(flag);

            if (conflict) {

                throw CONFLICTING_COMMAND(flag, conflict);
            }

            this._commandLookup.set(flag, command as never);
        });
    }

    protected registerParser<U extends OptionDefinitionList> (parser: CliParser<U>): void {

        const { name } = parser.definition;

        // this probably won't happen for now, as parsers are always defined after commands
        // we'd have a `DUPLICATE_COMMAND` error before
        if (this._parsers[name]) {

            throw DUPLICATE_PARSER(name, this._parsers[name]);
        }

        this._parsers[name] = parser as never;
    }
}
