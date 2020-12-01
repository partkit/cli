import { findPackageJson } from '../../../package-json';
import { command, CommandType } from '../../command';

export const VERSION_COMMAND = command({
    type: CommandType.SHARED,
    handler: (parser) => {

        const name = parser.definition.name;
        const version = findPackageJson()?.version || '<UNKNOWN VERSION>';

        console.log(`${ name } ${ version }`);
    },
    name: 'version',
    short: 'v',
    description: 'Displays the version of this cli.',
});
