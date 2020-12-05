import { findPackageJson } from '../../../package-json';
import { command, CommandType } from '../../command';

export const VERSION_COMMAND_NAME = 'version';

export const VERSION_COMMAND = command({
    type: CommandType.SHARED,
    handler: (parser) => {

        const name = parser.definition.name;
        const version = findPackageJson()?.version || '<UNKNOWN VERSION>';

        console.log(`${ name } ${ version }`);
    },
    name: VERSION_COMMAND_NAME,
    short: 'v',
    asFlag: true,
    description: 'Displays the version of this cli.',
});
