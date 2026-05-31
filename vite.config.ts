import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** GitHub Pages uses `/Scrollytelling/`; Netlify (root domain) sets `VITE_BASE=/` in netlify.toml. */
const base = process.env.VITE_BASE ?? '/Scrollytelling/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base,
  build: {
    // TensorFlow + BlazeFace form one large async chunk; 500 kB default is too strict.
    chunkSizeWarningLimit: 1600,
  },
})
