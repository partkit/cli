import { CommandParser } from '../../../src';
import { EchoOptions } from './config';

export const ECHO = (parser: CommandParser<EchoOptions>): void => {

    // the type of this config is inferred from the `EchoOptions` type
    const config = parser.config();

    console.log(config);

    if (config.verbose) {

        console.log('about to echo...');
    }

    let echo = config.foo;

    if (config.silent) {

        echo = echo.toLowerCase();
    }

    if (config.loud) {

        echo = echo.toUpperCase();
    }

    console.log(echo);

    if (config.verbose) {

        console.log('echo done...');
    }
};
