import { command, CommandType } from '../../../src';
import { ECHO_ARGUMENTS, ECHO_OPTIONS } from './config';
import { ECHO } from './echo';

export const ECHO_COMMAND = command({
    type: CommandType.ISOLATED,
    handler: ECHO,
    arguments: ECHO_ARGUMENTS,
    options: ECHO_OPTIONS,
    // disable `help` and `version` commands for the echo command
    commands: {
        help: null,
        version: null,
    },
    name: 'echo',
    description: 'Prints the value of the --foo option in uppercase or lowercase.',
});
