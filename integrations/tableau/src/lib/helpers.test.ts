import { describe, expect, it } from 'vitest';
import { config } from '../config';
import { createClient } from './helpers';

let legacyConfig = {
  serverUrl: 'https://dub01.online.tableau.com',
  siteContentUrl: 'admin-legacy',
  apiVersion: '3.28'
};

let legacyAuthOutput = { token: 'token', siteId: 'site-luid' };

let newAuthOutput = {
  token: 'token',
  siteId: 'site-luid',
  userId: 'user-luid',
  serverUrl: 'https://prod01.online.tableau.com/',
  apiVersion: 'v3.28'
};

describe('config schema migration', () => {
  it('preserves legacy connection values instead of stripping them', () => {
    expect(config.configSchema.parse(legacyConfig)).toEqual(legacyConfig);
  });

  it('accepts an empty config', () => {
    expect(config.configSchema.parse({})).toEqual({});
  });
});

describe('createClient', () => {
  it('builds a client from a legacy auth output with a legacy config', () => {
    expect(() => createClient(legacyConfig, legacyAuthOutput)).not.toThrow();
  });

  it('prefers the connection echoed in the auth output and normalizes it', () => {
    expect(() => createClient({}, newAuthOutput)).not.toThrow();
    expect(() => createClient(legacyConfig, newAuthOutput)).not.toThrow();
  });

  it('asks the user to reconnect when no server URL is available', () => {
    expect(() => createClient({}, legacyAuthOutput)).toThrowError(
      /Reconnect the Tableau authentication profile/
    );
  });

  it('ignores non-string legacy config values', () => {
    expect(() =>
      createClient({ serverUrl: 42, apiVersion: null }, legacyAuthOutput)
    ).toThrowError(/Reconnect the Tableau authentication profile/);
  });
});
