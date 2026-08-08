import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
// 端口 1025 由 README 全局约定分配，严格独占（strictPort）
export default defineConfig({
    plugins: [vue()],
    server: {
        host: true,
        port: 1025,
        strictPort: true,
    },
    preview: {
        port: 1025,
        strictPort: true,
    },
});
