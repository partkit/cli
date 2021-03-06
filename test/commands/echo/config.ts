import { args, ARRAY, BOOLEAN, NUMBER, opts, STRING } from '../../../src';
import { CLI_OPTIONS } from '../../config';

export const ECHO_OPTIONS = opts({
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

export const ECHO_ARGUMENTS = args(
    {
        parse: ARRAY(STRING),
        name: 'words',
        required: true,
    },
    {
        parse: NUMBER,
        name: 'which',
        default: 0,
    },
);

// a helper type so we don't have to write `typeof ECHO_ARGUMENTS`
export type EchoArguments = typeof ECHO_ARGUMENTS;
