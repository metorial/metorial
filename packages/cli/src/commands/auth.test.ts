import { describe, expect, it } from 'vitest';
import { normalizeCallbackRedirectUriForIntegration } from './auth';

describe('normalizeCallbackRedirectUriForIntegration', () => {
  it('normalizes Notion loopback redirects to localhost', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration('notion', 'http://127.0.0.1:45873/callback')
    ).toBe('http://localhost:45873/callback');
  });

  it('normalizes Intercom loopback redirects to localhost', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration('intercom', 'http://127.0.0.1:45873/callback')
    ).toBe('http://localhost:45873/callback');
  });

  it('normalizes Typeform loopback redirects to localhost', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration('typeform', 'http://127.0.0.1:45873/callback')
    ).toBe('http://localhost:45873/callback');
  });

  it('normalizes Xero loopback redirects to localhost', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration('xero', 'http://127.0.0.1:45873/callback')
    ).toBe('http://localhost:45873/callback');
  });

  it('normalizes Zendesk loopback redirects to localhost', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration('zendesk', 'http://127.0.0.1:45873/callback')
    ).toBe('http://localhost:45873/callback');
  });

  it('leaves unrelated integration redirects unchanged', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration('attio', 'http://127.0.0.1:45873/callback')
    ).toBe('http://127.0.0.1:45873/callback');
  });

  it('normalizes HubSpot developer platform OAuth redirects to localhost', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration(
        'hubspot',
        'http://127.0.0.1:45873/callback',
        'developer_platform_oauth'
      )
    ).toBe('http://localhost:45873/callback');
  });

  it('leaves HubSpot legacy OAuth redirects unchanged', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration(
        'hubspot',
        'http://127.0.0.1:45873/callback',
        'oauth'
      )
    ).toBe('http://127.0.0.1:45873/callback');
  });
});
