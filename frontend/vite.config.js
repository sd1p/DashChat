import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "https://dashchat-backend.onrender.com/",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  plugins: [react()],
});
// export default defineConfig({
//   server: {
//     host: true,
//     proxy: {
//       "/api": {
//         target: "https://dashchat-backend.onrender.com/",
//         changeOrigin: true,
//         secure: false,
//       },
//     },
//   },
//   plugins: [react()],
// });

//dev config
// export default defineConfig({
//   server: {
//     host: true,
//     port: 5173,
//     proxy: {
//       "/api": {
//         target: "http://[::1]:5000",
//         changeOrigin: true,
//         secure: false,
//       },
//     },
//   },
//   plugins: [react()],
// });
