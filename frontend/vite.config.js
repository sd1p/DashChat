import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     proxy: {
//       "/api": {
//         target: "https://dashchat-backend.onrender.com/",
//         changeOrigin: true,
//         secure: true,
//         ws: true,
//       },
//     },
//   },
// });
// export default defineConfig({
//   server: {
//     host: true,
//     proxy: {
//       "/api": {
//         target: "https://dashchat-backend.onrender.com/",
//         changeOrigin: true,
//         secure: false,
//         ws: true,
//       },
//     },
//   },
//   plugins: [react()],
// });

//prod
// export default defineConfig({
//   server: {
//     host: true,
//     proxy: {
//       "/api": {
//         target: "https://dashchat.onrender.com/",
//         changeOrigin: true,
//         secure: false,
//         ws: true,
//       },
//     },
//   },
//   plugins: [react()],
// });

// dev config
export default defineConfig({
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://[::1]:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react()],
});
