module.exports = {
  dependencies: {
    // react-native-camera is deprecated and has a multi-flavor Gradle conflict
    // (general vs mlkit) that Gradle 8 cannot auto-disambiguate.
    // It is not imported anywhere in the JS codebase so safe to exclude.
    'react-native-camera': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
