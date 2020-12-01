import { BOOLEAN, CommandConfig, NUMBER, options, STRING } from '../src';

export const CLI_OPTIONS = options({
    foo: {
        parse: STRING,
        default: 'foobar',
        short: 'f',
        description: 'A random string that you can provide.',
    },
    port: {
        parse: NUMBER,
        default: 3000,
        short: 'p',
        description: 'A port number.',
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
export type CliConfig = CommandConfig<CliOptions>;
