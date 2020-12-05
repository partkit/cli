import { CommandParser } from '../src';
import { CliOptions } from './config';

export const CLI = (parser: CommandParser<CliOptions>): void => {

    const config = parser.config();

    console.log('arguments...');
    console.log(parser.arguments());

    console.log('options...');
    console.log(parser.options());

    console.log('config...');
    console.log(config);

    if (config.verbose) {

        console.log(`foo: ${ config.foo }`);
        console.log(`port: ${ config.port }`);
    }
};
