import { defineConfig } from 'vite';

export default defineConfig({
    root: './',
    build: {
        outDir: 'dist',
        // Production optimizations
        minify: 'esbuild', // Faster than terser, still excellent compression
        target: 'es2015', // Support modern browsers
        // Code splitting for better caching
        rollupOptions: {
            input: './index.html',
            output: {
                manualChunks: {
                    // Separate vendor code for better caching
                    vendor: ['./src/js/config/cardData.js']
                }
            }
        },
        // Asset optimization
        assetsInlineLimit: 4096, // Inline assets < 4kb
        chunkSizeWarningLimit: 1000,
        // Source maps for debugging production issues
        sourcemap: false, // Disabled for smaller bundle size
        // CSS code splitting
        cssCodeSplit: true
    },
    server: {
        port: 3000,
        open: true
    },
    // Preview server config (for testing production build locally)
    preview: {
        port: 3000
    },
    // Development optimizations
    optimizeDeps: {
        exclude: [] // No dependencies to pre-bundle
    }
});
