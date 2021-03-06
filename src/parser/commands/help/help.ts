import { coerceArray } from '../../../utils';
import { ArgumentDefinitionList } from '../../argument';
import { command, CommandHandler, CommandType, HELP_COMMAND_NAME } from '../../command';
import { LONG_FLAG_PREFIX, SHORT_FLAG_PREFIX } from '../../flag';
import { Option, OptionDefinitionList } from '../../option';

// TODO: update help output format
export const formatOption = (option: Option): string | undefined => {

    if (option.hidden) return undefined;

    let format = (option.hiddenName ? [] : [option.name])
        .concat(coerceArray(option.alias))
        .map(flag => `${ LONG_FLAG_PREFIX }${ flag }`)
        .concat(coerceArray(option.short).map(flag => `${ SHORT_FLAG_PREFIX }${ flag }`))
        .join(' | ');

    if (!option.required) format = `[${ format }]`;

    format = `${ format } <${ option.parse.hint }>`;

    format = `${ format } ${ option.description ?? '' }`;

    return format;
};

export const HELP: CommandHandler<OptionDefinitionList, ArgumentDefinitionList> = (parser) => {

    const program = '<program>';

    const usage = `Usage: ${ program } [command] [arguments] [options]`;

    const options = Object
        .entries(parser.definition.options ?? {})
        .map(([name, option]) => formatOption({ ...option, name }))
        .join('\n');

    console.log(`\n${ usage }`);
    console.log(`\n${ options }\n`);
};

export const HELP_COMMAND = command({
    type: CommandType.SHARED,
    handler: HELP,
    short: HELP_COMMAND_NAME.charAt(0),
    asFlag: true,
    description: 'Displays this help screen.',
});
