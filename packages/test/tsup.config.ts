import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts', 'src/config.ts'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.module.js' : '.cjs'
    };
  },
  splitting: false,
  target: 'node18',
  external: ['async_hooks', 'vitest']
});
