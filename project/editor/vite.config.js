import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
// 端口 1025 由 README 全局约定分配，严格独占（strictPort）
export default defineConfig({
    plugins: [vue()],
    server: {
        host: true,
        port: 1025,
        strictPort: true,
        // 开发代理：/api/v1 → 后端 2010（docs/08 接口前缀）
        proxy: {
            '/api/v1': {
                target: 'http://localhost:2010',
                changeOrigin: true,
            },
        },
    },
    preview: {
        port: 1025,
        strictPort: true,
    },
});
