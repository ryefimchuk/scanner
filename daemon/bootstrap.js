const pkg = require('./package');

/**
 * @returns {boolean}
 */
function isPackagesReinstallingRequired() {

  const semver = require('semver');

  /**
   * @param {object} dependencies
   * @returns {boolean}
   */
  function isDependenciesInvalid(dependencies) {
    for (const packageId in dependencies) {
      try {
        const packageJSON = require(packageId + '/package.json');
        if (semver.satisfies(packageJSON.version, dependencies[packageId])) {
          continue;
        }
        return true;
      } catch (e) {
        return true;
      }
    }
  }

  return isDependenciesInvalid(pkg.dependencies) || isDependenciesInvalid(pkg.devDependencies);
}

/**
 * @param {string} command
 * @returns {Promise<void>}
 */
function execute(command) {
  return new Promise((resolve, reject) => {
    try {
      const exec = require('child_process').exec;
      exec(command, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    } catch (e) {
      reject();
    }
  });
}

/**
 * @returns {Promise<void>}
 */
function reinstallPackages() {
  console.log('Some packages are outdated or missing, reinstalling packages');
  return execute('npm install').catch(() => {
    return Promise.reject(new Error(`Unable to reinstall packages, please reinstall packages manually using command 'npm install'`));
  }).then(() => {
    require('console-clear')();
  });
}

/**
 * @returns {Promise<void>}
 */
function bootstrap() {
  if (isPackagesReinstallingRequired()) {
    return reinstallPackages();
  }
  return Promise.resolve();
}

/**
 * @returns {Promise<>}
 */
function checkRequiredPackages() {
  return new Promise((resolve, reject) => {
    try {
      resolve(require('semver'));
    } catch (e) {
      execute(`npm install semver --no-optional --no-package-lock`).then(() => {
        resolve();
      }, () => {
        reject(new Error('Unable to install required packages'));
      });
    }
  });
}

/**
 * @returns {Promise<void>}
 */
module.exports = () => {
  return checkRequiredPackages().then(() => {
    return bootstrap();
  });
};
