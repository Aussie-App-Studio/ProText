// Builds each extension entry as a standalone IIFE (content scripts cannot use ES module imports).
// Usage: node build.mjs [--watch]
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

const watch = process.argv.includes('--watch');
const entries = [
  { name: 'content', file: 'src/content/main.tsx', first: true },
  { name: 'background', file: 'src/background/index.ts' }
];

for (const e of entries) {
  await build({
    configFile: false,
    plugins: [react(), tailwind()],
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    publicDir: e.first ? 'public' : false,
    build: {
      outDir: 'dist',
      emptyOutDir: !!e.first,
      cssCodeSplit: false,
      minify: false,
      sourcemap: false,
      watch: watch ? {} : null,
      lib: { entry: e.file, name: 'MessagesPlus_' + e.name, formats: ['iife'], fileName: () => e.name + '.js', cssFileName: e.name }
    }
  });
}
