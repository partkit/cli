import { CommandParser } from '../../../src';
import { EchoArguments, EchoOptions } from './config';

export const ECHO = (parser: CommandParser<EchoOptions, EchoArguments>): void => {

    // the type of this config is inferred from the `EchoOptions` type
    const config = parser.config();
    const [words, which] = parser.arguments();

    console.log(config);
    console.log(parser.arguments());

    if (config.verbose) {

        console.log('about to echo...');
    }

    let echo = words?.length ? words[which ?? 0] : config.foo;

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
