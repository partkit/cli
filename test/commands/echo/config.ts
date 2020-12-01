import { BOOLEAN, options } from '../../../src';
import { CLI_OPTIONS } from '../../config';

export const ECHO_OPTIONS = options({
    // we can inherit options from any other command - like here from the parent cli command
    ...CLI_OPTIONS,
    // and add or override custom options
    silent: {
        parse: BOOLEAN,
        default: false,
        short: 's',
        description: 'Echo silently (lowercase).',
    },
    loud: {
        parse: BOOLEAN,
        default: false,
        short: 'l',
        description: 'Echo loudly (uppercase).',
    },
});

// a helper type so we don't have to write `typeof ECHO_OPTIONS`
export type EchoOptions = typeof ECHO_OPTIONS;
