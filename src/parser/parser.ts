/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { coerceArray } from '../utils';
import {
    BuiltinCommandDefinitionList,
    CommandConfig,
    CommandDefinition,
    CommandDefinitionList,
    CommandParser,
    CommandType,
    IsolatedCommandDefinition,
} from './command';
import { HELP_COMMAND } from './commands/help';
import { VERSION_COMMAND } from './commands/version';
import {
    DUPLICATE_COMMAND,
    DUPLICATE_OPTION,
    DUPLICATE_PARSER,
    INVALID_COMMAND,
    INVALID_OPTION,
    INVALID_USAGE,
    ParserError,
    SilentError,
} from './errors';
import { isFlag, LONG_FLAG_PREFIX, SHORT_FLAG_PREFIX } from './flag';
import { Option, OptionDefinition, OptionDefinitionList } from './option';

// TODO: allow inferring shared command names from CommandDefinitionList

export interface CliParserResult<T extends OptionDefinitionList> {
    command?: {
        name: string;
        argv: string[];
    };
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

// TODO: use these in code!
export const HELP_COMMAND_NAME = 'help';

export const VERSION_COMMAND_NAME = 'version';

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

    protected _commands: Record<string, CommandDefinition<OptionDefinitionList>> = {};

    protected _parsers: Record<string, CliParser<OptionDefinitionList>> = {};

    protected _options: Record<string, Option> = {};

    protected _commandLookup = new Map<string, CommandDefinition<OptionDefinitionList>>();

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

        this.registerCommand(command);
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

        const args: string[] = [];
        const options: Partial<CommandConfig<T>> = {};
        const config: CommandConfig<T> = {} as CommandConfig<T>;
        const result: CliParserResult<T> = {};

        const last = argv.length - 1;

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

                        const parentCommand = this._commands[result.command!.name];

                        if ((parentCommand.commands as CommandDefinitionList<OptionDefinitionList>)?.[command.name] !== command) {

                            throw INVALID_COMMAND(command.name, parentCommand.name);
                        }
                    }

                    // update the parser result with the matched command name
                    // and an updated arguments array (removing the command name)
                    result.command = {
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

                    // TODO: allow --no-<option> prefix for flags

                    // if the `curr` argument is an option (a flag) retrieve it
                    // from the options lookup map
                    const option = this._optionLookup.get(curr);

                    if (!option) {

                        // if the option was not found, it's an invalid option
                        throw INVALID_OPTION(curr, this.definition.name);
                    }

                    // set the option's value by invoking its type parser using
                    // the `next` argument if it is not a flag itself, otherwise
                    // use an empty string
                    option.value = option.parse(!nextFlag ? next ?? '' : '');

                    // store the option in the result's options object
                    options[option.name as keyof T] = option.value as never;

                    // if the `next` argument was used as option value we can skip
                    // it in the next parsing iteration by incrementing `i` by `1`
                    i += !nextFlag ? 1 : 0;
                }
            }
        }

        // after parsing the arguments array create a config object containing all
        // options - either specified on the command line or not - and provide the
        // parsed values or default values
        Object.entries(this._options).reduce((config, [name, option]) => {

            config[name as keyof T] = (option.value ?? option.default) as never;

            return config;

        }, config);

        // store the parser results in the result object
        result.arguments = args;
        result.options = options;
        result.config = config;

        this.result = result;

        // the parser is now done
        this.state = CliParserState.DONE;

        return result;
    }

    protected registerOptions (options: T): void {

        Object.entries(options).forEach(([key, option]) => this.registerOption(key, option));
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

            longFlags.concat(shortFlags).forEach(flag => {

                const duplicate = this._optionLookup.get(flag);

                if (duplicate) {

                    throw DUPLICATE_OPTION(flag, duplicate);
                }

                this._optionLookup.set(flag, option);
            });
        }
    }

    protected registerCommands (commands: CommandDefinitionList<T> | BuiltinCommandDefinitionList): void {

        Object.values(commands).forEach(command => {

            // BuiltinCommandDefinitionList allows `null` values for the `help` and `version` command
            if (command) { this.registerCommand(command); }
        });
    }

    protected registerCommand<U extends OptionDefinitionList> (command: CommandDefinition<U>): void {

        const { name } = command;

        if (this._commands[name]) {

            throw DUPLICATE_COMMAND(name, this._commands[name]);
        }

        this._commands[name] = command as never;

        // TODO: maybe allow handling commands like flags (with prefixes)
        [name].concat(coerceArray(command.alias)).concat(coerceArray(command.short)).forEach(flag => {

            const duplicate = this._commandLookup.get(flag);

            if (duplicate) {

                throw DUPLICATE_COMMAND(flag, duplicate);
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
