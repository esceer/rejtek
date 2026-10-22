// Signs Android release builds with the owner's key instead of the template's public debug key.
// The keystore and its passwords stay outside the repo, in ~/.gradle/gradle.properties:
//   REJTEK_RELEASE_STORE_FILE, REJTEK_RELEASE_STORE_PASSWORD, REJTEK_RELEASE_KEY_ALIAS, REJTEK_RELEASE_KEY_PASSWORD
// Without them a release build fails instead of falling back to the debug key.
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_SIGNING_CONFIG = `
        release {
            if (project.hasProperty('REJTEK_RELEASE_STORE_FILE')) {
                storeFile file(REJTEK_RELEASE_STORE_FILE)
                storePassword REJTEK_RELEASE_STORE_PASSWORD
                keyAlias REJTEK_RELEASE_KEY_ALIAS
                keyPassword REJTEK_RELEASE_KEY_PASSWORD
            }
        }`;

const DEBUG_SIGNED_RELEASE = /(release \{\s*(?:\/\/.*\s*)*)signingConfig signingConfigs\.debug/;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (gradle.includes('REJTEK_RELEASE_STORE_FILE')) {
      return config;
    }
    if (!gradle.includes('signingConfigs {') || !DEBUG_SIGNED_RELEASE.test(gradle)) {
      throw new Error('with-release-signing: unexpected android/app/build.gradle template');
    }
    gradle = gradle.replace('signingConfigs {', `signingConfigs {${RELEASE_SIGNING_CONFIG}`);
    gradle = gradle.replace(DEBUG_SIGNED_RELEASE, '$1signingConfig signingConfigs.release');
    config.modResults.contents = gradle;
    return config;
  });
};
