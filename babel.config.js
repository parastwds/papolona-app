module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@assets': './assets',
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    ],

    // Keep this last for the Worklets/Reanimated setup.
    // 'react-native-worklets/plugin',
  ],
};
