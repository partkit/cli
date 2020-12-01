import { CliParser, CommandType } from '../src';
import { CLI } from './cli';
import { ECHO_COMMAND } from './commands/echo';
import { CLI_OPTIONS } from './config';

// we create a CliParser instance for our root command
const cli = new CliParser({
    // a root command needs to be isolated
    type: CommandType.ISOLATED,
    handler: CLI,
    options: CLI_OPTIONS,
    name: 'cli',
    description: 'A test cli.',
    // a command can have shared sub-commands, which will use the same parser instance
    // and therefore the same options as the parent command
    commands: {
        sub: {
            type: CommandType.SHARED,
            handler: (parser) => {

                console.log('A shared sub command... These were the options provided via cli:');

                // options contains all the options which were specified via cli
                console.log(parser.options());
            },
            name: 'sub',
            description: 'A shared sub command.',
        },
    },
})
    // we can add independent sub-commands which have their own options and config via the `nest()` method
    .nest(ECHO_COMMAND);

// we run the CliParser instance
void (async () => await cli.run())();
