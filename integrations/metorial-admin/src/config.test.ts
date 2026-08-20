import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_API_URL,
  DEFAULT_API_VERSION,
  normalizeApiUrl,
  normalizeMetorialConfig,
  resolveMetorialRuntimeConfig
} from './config';

let assertReviewedProviderResolution = () => {
  let require = createRequire(import.meta.url);
  let resolved = realpathSync(require.resolve('@slates/provider'));
  let expected = realpathSync(
    fileURLToPath(new URL('../../../packages/provider/dist/index.cjs', import.meta.url))
  );
  let packageJson = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('../../../packages/provider/package.json', import.meta.url)),
      'utf8'
    )
  );
  expect(resolved).toBe(expected);
  expect(packageJson.version).toBe('1.0.0-rc.18');
};

describe('Metorial Admin config', () => {
  it('uses configured defaults', () => {
    assertReviewedProviderResolution();
    expect(normalizeMetorialConfig({})).toEqual({
      apiUrl: DEFAULT_API_URL,
      apiVersion: DEFAULT_API_VERSION
    });
  });

  it('normalizes trailing slashes from apiUrl', () => {
    expect(normalizeApiUrl('https://api.example.test///')).toBe('https://api.example.test');
  });

  it('uses apiVersion overrides', () => {
    expect(normalizeMetorialConfig({ apiVersion: 'mt_test_version' }).apiVersion).toBe(
      'mt_test_version'
    );
  });

  it('uses auth apiUrl for runtime calls when OAuth was completed with an override', () => {
    expect(
      resolveMetorialRuntimeConfig(
        { apiUrl: 'https://config.example.test', apiVersion: 'mt_test_version' },
        { apiUrl: 'https://auth.example.test/' }
      )
    ).toEqual({
      apiUrl: 'https://auth.example.test',
      apiVersion: 'mt_test_version'
    });
  });
});
