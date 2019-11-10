import semver from 'semver';

if (semver.gte(process.version, '6.0.0') && semver.lte(process.version, '8.2.1')) {

  const whitelist: string[] = ['ora'];

  // tslint:disable-next-line:no-var-requires
  require('@babel/register')({
    cache: true,
    extensions: ['.js'],
    ignore: [
      (filepath: string): boolean => {

        let ignore: boolean = true;

        if (filepath.indexOf('node_modules') !== -1) {

          for (let i = 0, len = whitelist.length; i < len; i++) {
            const moduleName: string = whitelist[i];

            if (filepath.indexOf(moduleName) !== -1) {
              ignore = false;
              break;
            }
          }
        }

        return ignore;
      },
    ],
    presets: ['@babel/preset-env'],
  });
}
