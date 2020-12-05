import { inspect } from 'util';
import { CommandDefinition, CommandParser } from './command';
import { OptionDefinition, OptionDefinitionList } from './option';

export class ParserError extends Error {
    name = this.constructor.name;
}

export class UsageError extends Error {
    name = this.constructor.name;
}

export class RegisterError extends Error {
    name = this.constructor.name;
}

export class SilentError extends Error {
    name = '';

    constructor () {

        super('');

        this.stack = undefined;
    }
}

export const INVALID_COMMAND = (command: string, parent?: string): ParserError =>
    new ParserError(`Invalid command. '${ command }' is not a valid ${ parent
        ? `sub-command of '${ parent }'`
        : 'command' }.`);

export const INVALID_OPTION = (option: string, command: string): ParserError =>
    new ParserError(`Invalid option. '${ option }' is not a valid option of command '${ command }'.`);

export const INVALID_USAGE = <T extends OptionDefinitionList> (parser: CommandParser<T>, api: string): UsageError =>
    new UsageError(`Invalid usage. Make sure to call '${ parser.constructor.name }.run()' before calling '${ parser.constructor.name }.${ api }()'.`);

export const DUPLICATE_OPTION = (option: string, conflict: OptionDefinition): RegisterError =>
    new RegisterError(`Duplicate option definition. The name/flag '${ option }' has already been used by another option:\n${ inspect(conflict) }`);

export const DUPLICATE_COMMAND = <T extends OptionDefinitionList> (command: string, conflict: CommandDefinition<T>): RegisterError =>
    new RegisterError(`Duplicate command definition. The name/alias '${ command }' has already been used by another command:\n${ inspect(conflict) }`);

export const DUPLICATE_PARSER = <T extends OptionDefinitionList> (command: string, conflict: CommandParser<T>): RegisterError =>
    new RegisterError(`Duplicate parser definition. The command name '${ command }' has already been used by another parser:\n${ inspect(conflict.definition) }`);

export const CONFLICTING_OPTION = <T extends OptionDefinitionList> (flag: string, conflict: CommandDefinition<T>): RegisterError =>
    new RegisterError(`Conflicting option definition. The option flag '${ flag }' has already been used by another command:\n${ inspect(conflict) }`);

export const CONFLICTING_COMMAND = (flag: string, conflict: OptionDefinition): RegisterError =>
    new RegisterError(`Conflicting command definition. The command flag '${ flag }' has already been used by another option:\n${ inspect(conflict) }`);
