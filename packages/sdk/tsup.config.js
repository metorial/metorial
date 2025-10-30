import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  splitting: false,
  sourcemap: true,
  clean: true,
  bundle: true,
  dts: true,
  esbuildOptions(options) {
    options.banner = {
      js: '// Licensed under the MIT License. From Metorial (metorial.com)'
    };
  }
});
