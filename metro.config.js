const { getDefaultConfig } = require('expo/metro-config');
const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
// const config = {};
const config = {
  transformer: {
    babelTransformerPath: require.resolve(
      'react-native-svg-transformer/expo',
    ),
  },

  resolver: {
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
  },
};
module.exports = {
  ...defaultConfig,
  ...config,
  transformer: {
    ...defaultConfig.transformer,
    ...config.transformer,
  },
  resolver: {
    ...defaultConfig.resolver,
    ...config.resolver,
  },
};
