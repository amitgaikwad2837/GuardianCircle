const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration for GuardianCircle
 * https://reactnative.dev/docs/metro
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // improves startup performance
      },
    }),
  },
  resolver: {
    // Ensure SQLite and crypto native modules resolve correctly
    assetExts: [...defaultConfig.resolver.assetExts, 'db'],
    sourceExts: [...defaultConfig.resolver.sourceExts, 'mjs', 'cjs'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
