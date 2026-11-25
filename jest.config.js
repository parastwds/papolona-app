// module.exports = {
//   preset: '@react-native/jest-preset',
//   moduleNameMapper: {
//     '^@/(.*)$': '<rootDir>/$1',
//   },
// };

module.exports = {
  preset: '@react-native/jest-preset',

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@assets/(.*)$': '<rootDir>/assets/$1',
  },
};
