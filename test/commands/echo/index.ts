import { command, CommandType } from '../../../src';
import { ECHO_OPTIONS } from './config';
import { ECHO } from './echo';

export const ECHO_COMMAND = command({
    type: CommandType.ISOLATED,
    handler: ECHO,
    options: ECHO_OPTIONS,
    name: 'echo',
    description: 'Prints the value of the --foo option in uppercase or lowercase.',
});