const appJson = require('./app.json');

module.exports = ({ config }) => {
  const expo = appJson.expo;
  const plugins = [
    ...(expo.plugins ?? []),
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: process.env.EAS_BUILD_PROFILE !== 'production'
        }
      }
    ]
  ];

  if (process.env.GOOGLE_MAPS_API_KEY) {
    plugins.push([
      'react-native-maps',
      {
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      }
    ]);
  }

  return {
    ...config,
    ...expo,
    plugins
  };
};
