import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: false,
  clean: true,
  external: ['lightweight-charts'],
  treeshake: true,
  splitting: false,
  target: 'es2020',
  outDir: 'dist',
});