import { describe, expect, it } from 'vitest';
import {
  DEFAULT_API_URL,
  DEFAULT_API_VERSION,
  normalizeApiUrl,
  normalizeMetorialConfig,
  resolveMetorialRuntimeConfig
} from './config';

describe('Metorial Admin config', () => {
  it('uses configured defaults', () => {
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
