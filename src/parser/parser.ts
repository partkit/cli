/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { coerceArray } from '../utils';
import { Argument, ArgumentConfig, ArgumentDefinition, ArgumentDefinitionList } from './argument';
import {
    BuiltinCommandDefinitionList,
    Command,
    CommandDefinition,
    CommandDefinitionList,
    CommandParser,
    CommandType,
    HELP_COMMAND_NAME,
    IsolatedCommandDefinition,
    VERSION_COMMAND_NAME,
} from './command';
import { HELP_COMMAND } from './commands/help';
import { VERSION_COMMAND } from './commands/version';
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
import { Option, OptionConfig, OptionDefinition, OptionDefinitionList } from './option';

interface CliParserCommandMatch {
    name: string;
    argv: string[];
}

export interface CliParserResult<O extends OptionDefinitionList, A extends ArgumentDefinitionList> {
    command?: CliParserCommandMatch;
    arguments?: Partial<ArgumentConfig<A>>;
    options?: Partial<OptionConfig<O>>;
    config?: OptionConfig<O>;
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
export class CliParser<O extends OptionDefinitionList, A extends ArgumentDefinitionList> implements CommandParser<O, A> {

    protected _commands: Record<string, Command<OptionDefinitionList, ArgumentDefinitionList>> = {};

    protected _parsers: Record<string, CliParser<OptionDefinitionList, ArgumentDefinitionList>> = {};

    protected _arguments: Argument[] = [];

    protected _options: Record<string, Option> = {};

    protected _commandLookup = new Map<string, Command<OptionDefinitionList, ArgumentDefinitionList>>();

    protected _optionLookup = new Map<string, Option<unknown>>();

    protected state: CliParserState = CliParserState.INITIAL;

    protected result: CliParserResult<O, A> = {};

    constructor (public definition: IsolatedCommandDefinition<O, A>) {

        const { arguments: args, options, commands } = this.definition;

        if (args) {

            this.registerArguments(args);
        }

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
    arguments (): Partial<ArgumentConfig<A>> {

        // we get the name of this method instead of using a string literal 'arguments'
        // this way we can refactor later on without having to worry about string constants
        const api = (this.constructor.prototype as CliParser<O, A>).arguments.name;

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
    options (): Partial<OptionConfig<O>> {

        // we get the name of this method instead of using a string literal 'options'
        // this way we can refactor later on without having to worry about string constants
        const api = (this.constructor.prototype as CliParser<O, A>).options.name;

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
    config (): OptionConfig<O> {

        // we get the name of this method instead of using a string literal 'config'
        // this way we can refactor later on without having to worry about string constants
        const api = (this.constructor.prototype as CliParser<O, A>).config.name;

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
    nest<U extends OptionDefinitionList, V extends ArgumentDefinitionList> (command: IsolatedCommandDefinition<U, V>): CliParser<O, A>;
    nest<U extends OptionDefinitionList, V extends ArgumentDefinitionList> (parser: CliParser<U, V>): CliParser<O, A>;
    nest<U extends OptionDefinitionList, V extends ArgumentDefinitionList> (commandOrParser: IsolatedCommandDefinition<U, V> | CliParser<U, V>): CliParser<O, A> {

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

                // encountering a parser error means that the cli input was invalid
                // we should display the command's help, if it is defined
                const help = this._commands[HELP_COMMAND_NAME];

                // if there is no help command for this command, throw the ParserError
                // the error will bubble up to the parent parser (for nested commands)
                // and eventually invoke a parent command's help, if defined
                if (!help) {

                    throw error;
                }

                // if there is a help command for this command, we update the parser state, ...
                this.state = CliParserState.DONE;

                // ...log the parser error *before* the help output ...
                console.error(`${ error.stack! }`);

                // ...and run the help command
                await help.handler(this as never);

                // throw a silent error which won't create any output (we already logged
                // the error *before* the usage info) but will still cause the process
                // to exit with an error code
                throw new SilentError();

            } else throw error;
        }
    }

    protected parse (argv: string[] = []): CliParserResult<O, A> {

        const last = argv.length - 1;
        const args: Partial<ArgumentConfig<A>> = [] as never;
        const options: Partial<OptionConfig<O>> = {};
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

                        if ((parentCommand.commands as CommandDefinitionList<O, A>)?.[command.name] !== command) {

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
                    const argument = this._arguments[args.length];

                    // TODO: should we error if there's no argument definition?
                    // TODO: handle argument default values
                    args.push(argument ? argument.parse(curr) : curr);

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
                    options[option.name as keyof O] = option.value as never;

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
        args: Partial<ArgumentConfig<A>>,
        options: Partial<OptionConfig<O>>,
        command?: CliParserCommandMatch,
    ): CliParserResult<O, A> {

        return {
            command,
            arguments: args,
            options,
            config: {
                // merge the default option values...
                ...this.createDefaultConfig(),
                // ...and the cli provided option values
                ...options,
            },
        };
    }

    protected createDefaultConfig (): OptionConfig<O> {

        return Object.entries(this._options).reduce((config, [name, option]) => {

            config[name as keyof O] = option.default as never;

            return config;

        }, {} as OptionConfig<O>);
    }

    protected registerArguments (args: A): void {

        args.forEach((arg, index) => this.registerArgument(index, arg));
    }

    protected registerArgument<T extends unknown> (index: number, definition: ArgumentDefinition<T>): void {

        this._arguments[index] = { ...definition };
    }

    protected registerOptions (options: O): void {

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

    protected registerCommands (commands: CommandDefinitionList<O, A> | BuiltinCommandDefinitionList): void {

        Object.entries(commands).forEach(([name, command]) => {

            // BuiltinCommandDefinitionList allows `null` values for the `help` and `version` command
            if (command) { this.registerCommand(name, command); }
        });
    }

    protected registerCommand<U extends OptionDefinitionList, V extends ArgumentDefinitionList> (name: string, definition: CommandDefinition<U, V>): void {

        const command: Command<U, V> = { ...definition, name };

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

    protected registerParser<U extends OptionDefinitionList, V extends ArgumentDefinitionList> (parser: CliParser<U, V>): void {

        const { name } = parser.definition;

        // this probably won't happen for now, as parsers are always defined after commands
        // we'd have a `DUPLICATE_COMMAND` error before
        if (this._parsers[name]) {

            throw DUPLICATE_PARSER(name, this._parsers[name]);
        }

        this._parsers[name] = parser as never;
    }
}
