import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Served at https://anispms.github.io/Fakhar27/ on GitHub Pages, so all
  // asset URLs need this prefix there. The CI workflow sets GITHUB_PAGES=true
  // for that build only; local dev/build stay at the root path.
  base: process.env.GITHUB_PAGES ? '/Fakhar27/' : '/',
  plugins: [react()],
})
