import { defineConfig, build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

// Chrome content scripts can't be ES modules, so each entry is built as its own self-contained IIFE.
export default defineConfig({
  plugins: [react(), tailwind()],
  define: { 'process.env.NODE_ENV': JSON.stringify('development') },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: false,
    sourcemap: 'inline',
    rollupOptions: {
      input: {
        content: 'src/content/main.tsx',
        background: 'src/background/index.ts',
        welcome: 'src/welcome/index.tsx'
      },
      output: { format: 'es', entryFileNames: '[name].js', inlineDynamicImports: false }
    }
  }
});
