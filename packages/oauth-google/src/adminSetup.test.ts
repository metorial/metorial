import { describe, expect, it } from 'vitest';
import { createGoogleOAuth, createGoogleWorkspaceAdminSetup } from './index';

let GOOGLE_CLIENT_ID = '123456789012-abc123.apps.googleusercontent.com';

describe('createGoogleWorkspaceAdminSetup', () => {
  it('builds a sign-in-only authorization URL without offline access or forced consent', async () => {
    let adminSetup = createGoogleWorkspaceAdminSetup({ productName: 'Google Drive' });
    let { url } = await adminSetup.getAuthorizationUrl({
      clientId: 'client-123',
      redirectUri: 'https://example.com/callback?flow=admin',
      state: 'state-123'
    });
    let parsed = new URL(url);

    expect(`${parsed.origin}${parsed.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      client_id: 'client-123',
      redirect_uri: 'https://example.com/callback?flow=admin',
      response_type: 'code',
      state: 'state-123',
      scope: 'openid email'
    });
  });

  it('returns Admin console trust instructions naming the product and OAuth client ID', async () => {
    let adminSetup = createGoogleWorkspaceAdminSetup({ productName: 'Google Drive' });
    let { instructions } = await adminSetup.handleCallback({ clientId: GOOGLE_CLIENT_ID });

    expect(instructions).toBe(
      [
        'To let users in your Google Workspace organization connect Google Drive, mark this app as trusted in the Google Admin console:',
        '',
        '1. Sign in to [admin.google.com](https://admin.google.com) as a super administrator.',
        '2. Go to **Security** → **Access and data control** → **API controls**.',
        '3. Under **App access control**, click **Manage third-party app access**.',
        '4. Click **Configure new app** and search for the OAuth client ID `123456789012-abc123.apps.googleusercontent.com`.',
        '5. Select the app, choose who it applies to, and set its access to **Trusted**.',
        '6. Click **Finish**. Changes can take up to 24 hours to apply, though usually less.'
      ].join('\n')
    );
  });

  it('appends notes as separate paragraphs after the steps', async () => {
    let adminSetup = createGoogleWorkspaceAdminSetup({
      productName: 'Google Admin',
      notes: ['First note.', 'Second note.']
    });
    let { instructions } = await adminSetup.handleCallback({ clientId: 'client-123' });

    expect(instructions.endsWith('usually less.\n\nFirst note.\n\nSecond note.')).toBe(true);
  });

  it('does not echo client IDs that are not Google OAuth client IDs into the markdown', async () => {
    let adminSetup = createGoogleWorkspaceAdminSetup({ productName: 'Google Drive' });

    for (let clientId of [
      'client-123',
      'x` [click](https://evil.example) `',
      'a`.apps.googleusercontent.com',
      'abc.apps.googleusercontent.com\n\n# injected'
    ]) {
      let { instructions } = await adminSetup.handleCallback({ clientId });
      expect(instructions).not.toContain(clientId);
      expect(instructions).toContain(
        "4. Click **Configure new app** and search for this app's OAuth client ID."
      );
    }
  });

  it('always reports required as a boolean', () => {
    expect(createGoogleWorkspaceAdminSetup({ productName: 'Google Drive' }).required).toBe(
      false
    );
    expect(
      createGoogleWorkspaceAdminSetup({ productName: 'Google Drive', required: false })
        .required
    ).toBe(false);
    expect(
      createGoogleWorkspaceAdminSetup({ productName: 'Google Admin', required: true }).required
    ).toBe(true);
  });
});

describe('createGoogleOAuth adminSetup option', () => {
  let scopes = [{ title: 'Mail', scope: 'scope:mail' }];

  it('omits adminSetup unless requested', () => {
    expect('adminSetup' in createGoogleOAuth({ scopes })).toBe(false);
  });

  it('attaches the Google Workspace admin setup helper when requested', async () => {
    let auth = createGoogleOAuth({ scopes, adminSetup: { productName: 'Gmail' } });
    let result = await auth.adminSetup?.handleCallback({ clientId: 'client-123' });

    expect(Object.keys(auth.adminSetup ?? {})).toEqual([
      'required',
      'getAuthorizationUrl',
      'handleCallback'
    ]);
    expect(auth.adminSetup?.required).toBe(false);
    expect(result?.instructions).toContain('connect Gmail, mark this app as trusted');
  });
});
