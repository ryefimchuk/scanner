const fs = require('fs');
const path = require('path');
const pkg = require('./package');

/**
 * @returns {string}
 */
function getHashPath() {
  return path.resolve(process.cwd(), 'dist/.hash');
}

/**
 * @returns {void}
 */
function setHash(hash) {
  try {
    fs.writeFileSync(getHashPath(), hash, {
      encoding: 'utf-8',
    });
  } catch (e) {
  }
}

/**
 * @returns {string | null}
 */
function getHash() {
  try {
    return fs.readFileSync(getHashPath(), {
      encoding: 'utf-8',
    }).toString();
  } catch (e) {
    return null;
  }
}

/**
 * @returns {Promise<string>}
 */
function calculateHash() {
  return require('folder-hash').hashElement('./src', {
    folders: { include: ['**'] },
  }).then((hashResult) => hashResult.hash, () => {
    return Promise.reject(new Error('Unable to calculate cache hash'));
  });
}

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
 * @returns {void}
 */
function clearOutput() {
  require('console-clear')();
}

/**
 * @returns {Promise<void>}
 */
function reinstallPackages() {
  console.log('Some packages are outdated or missing, reinstalling packages');
  return execute('npm install').catch(() => {
    return Promise.reject(new Error(`Unable to reinstall packages, please reinstall packages manually using command 'npm install'`));
  }).then(() => {
    clearOutput();
  });
}

/**
 * @returns {Promise<void>}
 */
function compileScripts() {
  console.log('Compiling scripts for better performance');
  return execute('npm run dist').then(() => {
    return calculateHash().then((hash) => {
      setHash(hash);
      clearOutput();
      return Promise.resolve();
    });
  }, () => {
    return Promise.reject(new Error('Unable to compile scripts'));
  });
}

/**
 * @returns {Promise<void>}
 */
function bootstrap() {
  if (isPackagesReinstallingRequired()) {
    return reinstallPackages().then(() => {
      return compileScripts();
    });
  }
  const hash = getHash();
  if (!hash) {
    return compileScripts();
  }
  return calculateHash().then((calculatedHash) => {
    if (calculatedHash !== hash) {
      return compileScripts();
    }
    return Promise.resolve();
  });
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
function checkNode() {
  if (!pkg.engines || !pkg.engines.node) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const semver = require('semver');
    const version = process.version;
    const minVersion = pkg.engines.node;
    if (semver.satisfies(version, minVersion)) {
      resolve();
    } else {
      reject(new Error(`Minimum node version must be ${minVersion} but ${version} found`));
    }
  });
}

/**
 * @returns {Promise<void>}
 */
module.exports = () => {
  return checkRequiredPackages().then(() => {
    return checkNode().then(() => {
      return bootstrap().then(() => {
        process.title = `${pkg.name}@${pkg.version}`;
      });
    });
  });
};
