import path from 'path';

/**
 * Minimalistic package.json interface
 */
export interface PackageJSON {
    [key: string]: unknown;
    name: string;
    version: string;
    description?: string;
    main?: string;
}

/**
 * Find the package.json file for a module and return it as an object.
 *
 * @remarks
 * Traverses parent directories until it finds the first package.json file.
 *
 * @param modulePath - The module path from where to start looking; if not specified, uses the current module's path
 */
export const findPackageJson = <T extends PackageJSON = PackageJSON> (modulePath?: string): T | undefined => {

    let packagePath: string | undefined;

    modulePath = path.dirname(require.resolve(modulePath ?? module.filename));

    while (!packagePath) {

        try {

            packagePath = require.resolve('./package.json', { paths: [modulePath] });

        } catch (error) {

            if (modulePath === '/') break;

            modulePath = path.resolve(modulePath, '..');
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return packagePath ? require(packagePath) as T : undefined;
};
