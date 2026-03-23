import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Scrollytelling/',
  build: {
    // TensorFlow + BlazeFace form one large async chunk; 500 kB default is too strict.
    chunkSizeWarningLimit: 1600,
  },
})
