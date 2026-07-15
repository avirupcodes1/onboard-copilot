import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, proxy /api to the local FastAPI server (uvicorn api.index:app --port 8000).
// In prod on Vercel, /api is served by the Python serverless function (see vercel.json).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
