import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages: replace 'lade-tracker' with your repo name
  base: '/evChargeTracker/',
})
