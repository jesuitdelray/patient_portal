const { getDefaultConfig } = require("expo/metro-config");

process.env.EXPO_NO_ROUTER = "1";

const config = getDefaultConfig(__dirname);

// Fix for "Automatic publicPath is not supported" error on Vercel
// Set explicit publicPath to empty string to use relative paths
process.env.EXPO_PUBLIC_PATH = process.env.EXPO_PUBLIC_PATH || "";

config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Disable automatic publicPath generation
// Use a stable module ID factory based on file path hash
// This ensures consistent IDs across rebuilds
config.serializer = {
  ...config.serializer,
  createModuleIdFactory: () => {
    // Simple hash function for stable IDs
    const hashString = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash);
    };
    return (path) => {
      // Use hash of path for stable, deterministic IDs
      return hashString(path);
    };
  },
};

// Web-specific fixes
if (config.resolver) {
  config.resolver.sourceExts = config.resolver.sourceExts || [];
  config.resolver.platforms = ["web", "native", "ios", "android"];
}

module.exports = config;
