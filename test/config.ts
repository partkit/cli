import { ARRAY, BOOLEAN, OptionConfig, NUMBER, opts, STRING } from '../src';

export const CLI_OPTIONS = opts({
    foo: {
        parse: STRING,
        default: 'foobar',
        short: 'f',
        description: 'A random string that you can provide.',
    },
    foos: {
        parse: ARRAY(STRING),
        default: [],
        description: 'A list of strings.',
    },
    port: {
        parse: NUMBER,
        default: 3000,
        short: 'p',
        description: 'A port number.',
    },
    ports: {
        parse: ARRAY(NUMBER),
        default: [],
        description: 'A list of ports.',
    },
    verbose: {
        parse: BOOLEAN,
        default: false,
        description: 'Enable verbose logging.',
    },
});

// a helper type so we don't have to write `typeof CLI_OPTIONS`
export type CliOptions = typeof CLI_OPTIONS;

// a helper type so we don't have to write `CommandConfig<CliOptions>`
export type CliConfig = OptionConfig<CliOptions>;
