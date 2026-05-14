import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.09851a537d3747deb4d4c3988580e8f5',
  appName: 'morning-vibe-check',
  webDir: 'dist',
  server: {
    url: 'https://09851a53-7d37-47de-b4d4-c3988580e8f5.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    Health: {
      // permissions configured at runtime
    },
  },
};

export default config;
