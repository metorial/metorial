import { describe, expect, it } from 'vitest';
import {
  DEFAULT_API_VERSION,
  isTableauCloud,
  normalizeApiVersion,
  normalizeConnection,
  normalizeServerUrl,
  normalizeSiteContentUrl
} from './connection';

describe('normalizeServerUrl', () => {
  it('keeps a clean base URL', () => {
    expect(normalizeServerUrl('https://dub01.online.tableau.com')).toBe(
      'https://dub01.online.tableau.com'
    );
  });

  it('strips trailing slashes', () => {
    expect(normalizeServerUrl('https://dub01.online.tableau.com/')).toBe(
      'https://dub01.online.tableau.com'
    );
  });

  it('strips pasted browser paths and hashes', () => {
    expect(normalizeServerUrl('https://dub01.online.tableau.com/#/site/acme/home')).toBe(
      'https://dub01.online.tableau.com'
    );
  });

  it('adds https when the scheme is missing', () => {
    expect(normalizeServerUrl('dub01.online.tableau.com')).toBe(
      'https://dub01.online.tableau.com'
    );
  });

  it('keeps http for on-premise servers', () => {
    expect(normalizeServerUrl('http://tableau.internal:8000/')).toBe(
      'http://tableau.internal:8000'
    );
  });

  it('rejects empty and invalid values', () => {
    expect(() => normalizeServerUrl('')).toThrowError(/server URL is required/);
    expect(() => normalizeServerUrl('   ')).toThrowError(/server URL is required/);
    expect(() => normalizeServerUrl('ftp://tableau.example.com')).toThrowError(
      /must use http or https/
    );
  });
});

describe('normalizeSiteContentUrl', () => {
  it('keeps a bare site name', () => {
    expect(normalizeSiteContentUrl('acme')).toBe('acme');
  });

  it('extracts the site name from a pasted full browser URL', () => {
    expect(normalizeSiteContentUrl('https://dub01.online.tableau.com/#/site/acme')).toBe(
      'acme'
    );
  });

  it('extracts the site name from URL fragments and deeper paths', () => {
    expect(normalizeSiteContentUrl('#/site/acme')).toBe('acme');
    expect(normalizeSiteContentUrl('/site/acme/workbooks')).toBe('acme');
    expect(
      normalizeSiteContentUrl('https://dub01.online.tableau.com/#/site/acme/views?x=1')
    ).toBe('acme');
  });

  it('extracts the site name from /t/ share and embed links', () => {
    expect(
      normalizeSiteContentUrl('https://dub01.online.tableau.com/t/acme/views/Dashboard')
    ).toBe('acme');
    expect(normalizeSiteContentUrl('/t/acme')).toBe('acme');
  });

  it('passes through empty values for the Tableau Server default site', () => {
    expect(normalizeSiteContentUrl('')).toBe('');
    expect(normalizeSiteContentUrl(undefined)).toBe('');
    expect(normalizeSiteContentUrl('  ')).toBe('');
  });

  it('trims surrounding slashes and hashes', () => {
    expect(normalizeSiteContentUrl('/acme/')).toBe('acme');
  });

  it('rejects URLs and hostnames without a /site/ segment', () => {
    expect(() => normalizeSiteContentUrl('https://dub01.online.tableau.com')).toThrowError(
      /not a Tableau site name/
    );
    expect(() => normalizeSiteContentUrl('dub01.online.tableau.com')).toThrowError(
      /not a Tableau site name/
    );
  });
});

describe('normalizeApiVersion', () => {
  it('keeps a plain version', () => {
    expect(normalizeApiVersion('3.28')).toBe('3.28');
  });

  it('strips a leading v', () => {
    expect(normalizeApiVersion('v3.28')).toBe('3.28');
  });

  it('falls back to the default for empty values', () => {
    expect(normalizeApiVersion('')).toBe(DEFAULT_API_VERSION);
    expect(normalizeApiVersion(undefined)).toBe(DEFAULT_API_VERSION);
  });

  it('rejects non-numeric versions', () => {
    expect(() => normalizeApiVersion('latest')).toThrowError(/API version/);
  });
});

describe('normalizeConnection', () => {
  it('normalizes a full pasted browser URL in both fields', () => {
    expect(
      normalizeConnection({
        serverUrl: 'https://dub01.online.tableau.com/',
        siteContentUrl: 'https://dub01.online.tableau.com/#/site/acme',
        apiVersion: '3.28'
      })
    ).toEqual({
      serverUrl: 'https://dub01.online.tableau.com',
      siteContentUrl: 'acme',
      apiVersion: '3.28'
    });
  });

  it('requires a site content URL on Tableau Cloud', () => {
    expect(() =>
      normalizeConnection({
        serverUrl: 'https://dub01.online.tableau.com',
        siteContentUrl: ''
      })
    ).toThrowError(/Tableau Cloud requires a site content URL/);
  });

  it('allows an empty site content URL on Tableau Server', () => {
    expect(
      normalizeConnection({ serverUrl: 'https://tableau.example.com', siteContentUrl: '' })
    ).toEqual({
      serverUrl: 'https://tableau.example.com',
      siteContentUrl: '',
      apiVersion: DEFAULT_API_VERSION
    });
  });
});

describe('isTableauCloud', () => {
  it('detects Tableau Cloud pods', () => {
    expect(isTableauCloud('https://dub01.online.tableau.com')).toBe(true);
    expect(isTableauCloud('https://tableau.example.com')).toBe(false);
  });
});
