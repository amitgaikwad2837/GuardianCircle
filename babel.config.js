module.exports = {
  presets: ['module:@react-native/babel-preset'],
  env: {
    test: {
      plugins: ['@babel/plugin-transform-dynamic-import'],
    },
  },
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@core': './src/core',
          '@features': './src/features',
          '@shared': './src/shared',
          '@app': './src/app',
          '@assets': './src/assets',
        },
      },
    ],
    'react-native-reanimated/plugin', // must be last
  ],
};
