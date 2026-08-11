import { describe, expect, it } from 'vitest';

import {
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

  it('rejects URL credentials without leaking them', () => {
    expectLookerUrlError(
      () =>
        normalizeLookerInstanceUrl('https://url-user:url-password@analytics.looker.example'),
      'looker_instance_url_invalid',
      ['url-user', 'url-password']
    );
  });

  it.each([
    [
      'query parameters',
      'https://analytics.looker.example/proxy?access_token=query-secret',
      'https://analytics.looker.example/proxy'
    ],
    [
      'a fragment',
      'https://analytics.looker.example#fragment-secret',
      'https://analytics.looker.example'
    ],
    [
      'query and fragment noise',
      'https://analytics.looker.example/proxy/?toggle=dat#/explore',
      'https://analytics.looker.example/proxy'
    ]
  ])('strips %s instead of rejecting the URL', (_name, value, expected) => {
    expect(normalizeLookerInstanceUrl(value)).toBe(expected);
  });

  it.each([
    ['bare host', 'mycompany.cloud.looker.com', 'https://mycompany.cloud.looker.com'],
    [
      'host with port and path',
      'analytics.looker.example:19999/looker/proxy/',
      'https://analytics.looker.example:19999/looker/proxy'
    ],
    [
      'host with an API suffix',
      'analytics.looker.example/api/4.0/',
      'https://analytics.looker.example'
    ]
  ])('defaults a missing scheme to HTTPS for a %s', (_name, value, expected) => {
    expect(normalizeLookerInstanceUrl(value)).toBe(expected);
  });

  it('reduces pasted Looker-hosted page URLs to the instance root', () => {
    expect(
      normalizeLookerInstanceUrl('https://mycompany.cloud.looker.com/dashboards/42?filters=x')
    ).toBe('https://mycompany.cloud.looker.com');
    expect(normalizeLookerInstanceUrl('MyCompany.Cloud.Looker.Com/looks/7')).toBe(
      'https://mycompany.cloud.looker.com'
    );
    // Self-hosted instances may legitimately sit behind a proxy path prefix.
    expect(normalizeLookerInstanceUrl('https://analytics.example.com/looker/proxy')).toBe(
      'https://analytics.example.com/looker/proxy'
    );
  });

  it('requires at least one URL when resolving the connection instance', () => {
    expectLookerUrlError(() => resolveLookerInstanceUrl({}), 'looker_instance_url_required');
  });

  it('resolves binding-only and legacy-config-only inputs', () => {
    expect(
      resolveLookerInstanceUrl({
        authenticatedInstanceUrl: 'https://bound.looker.example/proxy/'
      })
    ).toBe('https://bound.looker.example/proxy');
    expect(
      resolveLookerInstanceUrl({
        legacyConfigInstanceUrl: 'https://legacy.looker.example/api/4.0/'
      })
    ).toBe('https://legacy.looker.example');
  });

  it('prefers the authenticated binding over a different legacy config URL', () => {
    expect(
      resolveLookerInstanceUrl({
        authenticatedInstanceUrl: 'https://bound.looker.example/proxy/api/4.0/',
        legacyConfigInstanceUrl: 'https://drifted-config.looker.example'
      })
    ).toBe('https://bound.looker.example/proxy');
  });

  it.each([
    ['blank', '   '],
    ['non-string', 42],
    ['null', null]
  ])('falls back to the legacy config URL when the binding is %s', (_name, binding) => {
    expect(
      resolveLookerInstanceUrl({
        authenticatedInstanceUrl: binding,
        legacyConfigInstanceUrl: 'https://legacy.looker.example/'
      })
    ).toBe('https://legacy.looker.example');
  });
});
