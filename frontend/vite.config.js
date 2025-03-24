// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // 1. Silence "use client" warnings
      onwarn(warning, warn) {
        if (
          warning.code === 'MODULE_LEVEL_DIRECTIVE' && 
          warning.message.includes('"use client"')
        ) {
          return;
        }
        warn(warning);
      },
      
      // 2. Manual chunking for better performance
      output: {
        manualChunks: {
          antd: ['antd'],
          lodash: ['lodash'],
          react: ['react', 'react-dom'],
          vendor: [
            '@ant-design/icons',
            '@stripe/stripe-js',
            'react-router-dom',
            'dayjs'
          ]
        }
      }
    },
    // 3. Adjust chunk size warnings
    chunkSizeWarningLimit: 1000
  }
});