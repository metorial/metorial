import { describe, expect, it } from 'vitest';

import {
  assertLookerAuthenticatedInstanceUrl,
  buildLookerApiBaseUrl,
  normalizeLookerInstanceUrl,
  resolveLookerInstanceUrl
} from './instance-url';

let expectLookerUrlError = (run: () => unknown, reason: string, secrets: string[] = []) => {
  let caught: unknown;

  try {
    run();
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeDefined();
  expect((caught as { data?: { reason?: string } }).data?.reason).toBe(reason);

  let rendered = `${caught instanceof Error ? caught.message : String(caught)}\n${JSON.stringify(
    (caught as { data?: unknown }).data
  )}`;
  for (let secret of secrets) {
    expect(rendered).not.toContain(secret);
  }
};

describe('Looker instance URL helpers', () => {
  it('trims input, trailing slashes, and exact terminal API suffixes', () => {
    expect(normalizeLookerInstanceUrl('  https://analytics.looker.example/api/4.0///  ')).toBe(
      'https://analytics.looker.example'
    );
    expect(normalizeLookerInstanceUrl('https://analytics.looker.example/api/4.0beta/')).toBe(
      'https://analytics.looker.example/api/4.0beta'
    );
    expect(buildLookerApiBaseUrl('https://analytics.looker.example/api/4.0/')).toBe(
      'https://analytics.looker.example/api/4.0'
    );
  });

  it('removes repeated API suffixes and re-trims exposed slashes', () => {
    let repeatedSuffixUrl = 'https://analytics.looker.example/proxy///api/4.0///api/4.0////';

    expect(normalizeLookerInstanceUrl(repeatedSuffixUrl)).toBe(
      'https://analytics.looker.example/proxy'
    );
    expect(buildLookerApiBaseUrl(repeatedSuffixUrl)).toBe(
      'https://analytics.looker.example/proxy/api/4.0'
    );
  });

  it('preserves an explicit port and proxy path prefix', () => {
    expect(normalizeLookerInstanceUrl('https://analytics.looker.example:19999///')).toBe(
      'https://analytics.looker.example:19999'
    );
    expect(
      buildLookerApiBaseUrl('https://analytics.looker.example:19999/looker/proxy///')
    ).toBe('https://analytics.looker.example:19999/looker/proxy/api/4.0');
  });

  it.each([
    ['IPv6 host', 'https://[2001:db8::1]:19999/looker/', 'https://[2001:db8::1]:19999/looker'],
    [
      'internationalized host',
      'https://münich.looker.example/looker/',
      'https://xn--mnich-kva.looker.example/looker'
    ],
    [
      'encoded proxy path',
      'https://analytics.looker.example/%E2%9C%93%20proxy/',
      'https://analytics.looker.example/%E2%9C%93%20proxy'
    ],
    [
      'explicit default port',
      'https://analytics.looker.example:443/looker/',
      'https://analytics.looker.example:443/looker'
    ]
  ])('canonicalizes a URL with an %s', (_name, value, expected) => {
    expect(normalizeLookerInstanceUrl(value)).toBe(expected);
  });

  it.each([
    ['missing', undefined, 'looker_instance_url_required'],
    ['blank', '   ', 'looker_instance_url_required'],
    ['malformed', 'not a URL', 'looker_instance_url_invalid'],
    ['non-HTTPS', 'http://analytics.looker.example', 'looker_instance_url_invalid']
  ])('rejects a %s URL', (_name, value, reason) => {
    expectLookerUrlError(() => normalizeLookerInstanceUrl(value), reason);
  });

  it.each([
    'https://url-user:url-password@analytics.looker.example',
    'https://analytics.looker.example?access_token=query-secret',
    'https://analytics.looker.example#fragment-secret'
  ])('rejects URL credentials, query parameters, and fragments without leaking them', value => {
    expectLookerUrlError(
      () => normalizeLookerInstanceUrl(value),
      'looker_instance_url_invalid',
      ['url-user', 'url-password', 'query-secret', 'fragment-secret']
    );
  });

  it('requires at least one URL when resolving configuration and legacy auth', () => {
    expectLookerUrlError(() => resolveLookerInstanceUrl({}), 'looker_instance_url_required');
  });

  it('resolves config-only and legacy-only inputs', () => {
    expect(
      resolveLookerInstanceUrl({
        configInstanceUrl: 'https://configured.looker.example/proxy/'
      })
    ).toBe('https://configured.looker.example/proxy');
    expect(
      resolveLookerInstanceUrl({
        legacyAuthInstanceUrl: 'https://legacy.looker.example/api/4.0/'
      })
    ).toBe('https://legacy.looker.example');
  });

  it('prefers config when both inputs normalize to the same URL', () => {
    expect(
      resolveLookerInstanceUrl({
        configInstanceUrl: 'https://dual.looker.example/proxy/api/4.0/',
        legacyAuthInstanceUrl: '  https://dual.looker.example/proxy/  '
      })
    ).toBe('https://dual.looker.example/proxy');
  });

  it('rejects a true mismatch without echoing either URL', () => {
    let configUrl = 'https://configured-secret.looker.example';
    let legacyUrl = 'https://legacy-secret.looker.example';

    expectLookerUrlError(
      () =>
        resolveLookerInstanceUrl({
          configInstanceUrl: configUrl,
          legacyAuthInstanceUrl: legacyUrl
        }),
      'looker_instance_url_mismatch',
      [configUrl, legacyUrl, 'configured-secret', 'legacy-secret']
    );
  });

  it('accepts missing legacy bindings and normalized-equivalent authenticated URLs', () => {
    expect(
      assertLookerAuthenticatedInstanceUrl({
        currentInstanceUrl: 'https://bound.looker.example/proxy/api/4.0/'
      })
    ).toBe('https://bound.looker.example/proxy');
    expect(
      assertLookerAuthenticatedInstanceUrl({
        currentInstanceUrl: 'https://bound.looker.example/proxy/api/4.0/',
        authenticatedInstanceUrl: 'https://bound.looker.example/proxy/'
      })
    ).toBe('https://bound.looker.example/proxy');
  });

  it('requires reauthentication for mismatched or invalid stored bindings without leaking URLs', () => {
    let currentUrl = 'https://current-sensitive.looker.example/proxy';
    let authenticatedUrl = 'https://authenticated-sensitive.looker.example/proxy';

    expectLookerUrlError(
      () =>
        assertLookerAuthenticatedInstanceUrl({
          currentInstanceUrl: currentUrl,
          authenticatedInstanceUrl: authenticatedUrl
        }),
      'looker_reauthentication_required',
      [currentUrl, authenticatedUrl, 'current-sensitive', 'authenticated-sensitive']
    );
    expectLookerUrlError(
      () =>
        assertLookerAuthenticatedInstanceUrl({
          currentInstanceUrl: currentUrl,
          authenticatedInstanceUrl: 'stored-binding-secret is not a URL'
        }),
      'looker_reauthentication_required',
      [currentUrl, 'stored-binding-secret']
    );
    expectLookerUrlError(
      () =>
        assertLookerAuthenticatedInstanceUrl({
          currentInstanceUrl: currentUrl,
          authenticatedInstanceUrl: null
        }),
      'looker_reauthentication_required',
      [currentUrl]
    );
  });
});
