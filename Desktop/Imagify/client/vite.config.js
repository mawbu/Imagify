import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',          // Cho phép kết nối từ bên ngoài (Render)
    port: process.env.PORT || 5173  // Dùng cổng do Render cung cấp
  }
})
