const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// WebView form shell assets (HTML, CSS, fonts) are copied to the document directory
// at runtime via expo-file-system. Metro must treat these extensions as assets.
config.resolver.assetExts.push('html', 'css', 'txt', 'woff', 'woff2');

module.exports = config;
