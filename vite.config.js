import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // 1) Enable CORS and allow everything:
    cors: {
      origin: '*',                              // Allow all origins
      methods: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'],
      allowedHeaders: ['*'],                    // Allow all request headers
    },
  }
})
