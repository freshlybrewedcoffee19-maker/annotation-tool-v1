import {defineConfig} from 'vite';
// Mask suggestions deliberately use CPU/WASM in a worker. Exclude GPU binaries
// so every hosted asset remains below Cloudflare Pages' per-file limit.
export default defineConfig({resolve:{alias:[{find:'onnxruntime-web/webgpu',replacement:'onnxruntime-web/wasm'}]}});
