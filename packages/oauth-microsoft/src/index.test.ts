import { describe, expect, it } from 'vitest';
import {
  buildMicrosoftGraphUploadBody,
  createMicrosoftGraphOauth,
  mapAzureDevOpsScopes,
  normalizeMicrosoftRedirectUri,
  normalizeMicrosoftRedirectUriForIntegration,
  resolveMicrosoftTenant,
  usesMicrosoftOAuth
} from './index';

describe('@slates/oauth-microsoft', () => {
  it('normalizes loopback IPv4 redirect URIs to localhost', () => {
    expect(normalizeMicrosoftRedirectUri('http://127.0.0.1:45873/callback')).toBe(
      'http://localhost:45873/callback'
    );
  });

  it('leaves non-loopback redirect URIs unchanged', () => {
    expect(normalizeMicrosoftRedirectUri('https://example.com/callback')).toBe(
      'https://example.com/callback'
    );
  });

  it('detects Microsoft OAuth integrations', () => {
    expect(usesMicrosoftOAuth('sharepoint')).toBe(true);
    expect(usesMicrosoftOAuth('github')).toBe(false);
  });

  it('only normalizes redirect URIs for Microsoft OAuth integrations', () => {
    expect(
      normalizeMicrosoftRedirectUriForIntegration('outlook', 'http://127.0.0.1:45873/callback')
    ).toBe('http://localhost:45873/callback');
    expect(
      normalizeMicrosoftRedirectUriForIntegration('github', 'http://127.0.0.1:45873/callback')
    ).toBe('http://127.0.0.1:45873/callback');
  });

  it('can normalize redirect URIs in the OAuth factory', async () => {
    let oauth = createMicrosoftGraphOauth({
      name: 'SharePoint',
      key: 'oauth',
      tenant: 'common',
      scopes: [],
      normalizeRedirectUri: true
    });

    let { url } = await oauth.getAuthorizationUrl({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'http://127.0.0.1:45873/callback',
      scopes: [],
      state: 'state'
    });

    expect(new URL(url).searchParams.get('redirect_uri')).toBe(
      'http://localhost:45873/callback'
    );
  });

  it('uses the default tenant when the input tenant is missing or blank', () => {
    expect(resolveMicrosoftTenant(undefined, 'common')).toBe('common');
    expect(resolveMicrosoftTenant('   ', 'organizations')).toBe('organizations');
  });

  it('uses a trimmed tenant override when provided', () => {
    expect(resolveMicrosoftTenant(' tenants/foo ', 'common')).toBe('tenants/foo');
  });

  it('builds Azure DevOps resource-qualified scopes with offline access', async () => {
    let oauth = createMicrosoftGraphOauth({
      name: 'Azure DevOps',
      key: 'oauth',
      tenant: 'organizations',
      scopes: [
        {
          title: 'Profile',
          description: 'Read Azure DevOps profile information',
          scope: 'vso.profile'
        }
      ],
      scopeMapper: mapAzureDevOpsScopes,
      extraScopes: ['offline_access']
    });

    let { url } = await oauth.getAuthorizationUrl({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'http://localhost/callback',
      scopes: ['vso.profile'],
      state: 'state'
    });

    let parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe(
      'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize'
    );
    expect(parsed.searchParams.get('scope')).toBe(
      '499b84ac-1321-427f-aa17-267ca6975798/vso.profile offline_access'
    );
  });

  it('can preserve OAuth output when a refresh token is missing', async () => {
    let oauth = createMicrosoftGraphOauth({
      name: 'Azure DevOps',
      key: 'oauth',
      tenant: 'organizations',
      scopes: [],
      onMissingRefreshToken: 'preserve'
    });
    let output = { token: 'existing-token' };

    await expect(
      oauth.handleTokenRefresh({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        scopes: [],
        output
      })
    ).resolves.toEqual({ output });
  });

  it('decodes binary-looking base64 uploads for non-text files', () => {
    let body = buildMicrosoftGraphUploadBody(
      'report.docx',
      'SGVsbG8=',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    expect(Buffer.isBuffer(body)).toBe(true);
    expect(body.toString('utf8')).toBe('Hello');
  });

  it('preserves text uploads even when the content looks like base64', () => {
    let body = buildMicrosoftGraphUploadBody('notes.txt', 'SGVsbG8=', 'text/plain');

    expect(body).toBe('SGVsbG8=');
  });
});
