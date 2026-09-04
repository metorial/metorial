import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createOAuthCallbackListener, getOAuthCallbackCode } from './oauth';

let originalOAuthPort = process.env.SLATES_OAUTH_PORT;
let originalOAuthCallbackOverride = process.env.OAUTH_CALLBACK_OVERRIDE;

beforeEach(() => {
  process.env.SLATES_OAUTH_PORT = '0';
  delete process.env.OAUTH_CALLBACK_OVERRIDE;
});

afterEach(() => {
  if (originalOAuthPort === undefined) {
    delete process.env.SLATES_OAUTH_PORT;
  } else {
    process.env.SLATES_OAUTH_PORT = originalOAuthPort;
  }

  if (originalOAuthCallbackOverride === undefined) {
    delete process.env.OAUTH_CALLBACK_OVERRIDE;
  } else {
    process.env.OAUTH_CALLBACK_OVERRIDE = originalOAuthCallbackOverride;
  }
});

describe('getOAuthCallbackCode', () => {
  it('returns an OAuth 2 code', () => {
    expect(getOAuthCallbackCode(new URLSearchParams({ code: 'oauth2-code' }))).toBe(
      'oauth2-code'
    );
  });

  it('returns an OAuth 1.0a verifier', () => {
    expect(
      getOAuthCallbackCode(new URLSearchParams({ oauth_verifier: 'oauth1-verifier' }))
    ).toBe('oauth1-verifier');
  });

  it('prefers an OAuth 2 code when both callback values are present', () => {
    expect(
      getOAuthCallbackCode(
        new URLSearchParams({ code: 'oauth2-code', oauth_verifier: 'oauth1-verifier' })
      )
    ).toBe('oauth2-code');
  });

  it('returns null when neither callback value is present', () => {
    expect(getOAuthCallbackCode(new URLSearchParams({ state: 'callback-state' }))).toBeNull();
  });
});

describe('createOAuthCallbackListener', () => {
  it('resolves OAuth 1.0a verifier callbacks with all callback parameters', async () => {
    let listener = await createOAuthCallbackListener();
    let callbackUrl = new URL(listener.redirectUri);
    callbackUrl.search = new URLSearchParams({
      state: listener.state,
      oauth_verifier: 'oauth1-verifier',
      oauth_token: 'request-token'
    }).toString();

    let [response, result] = await Promise.all([fetch(callbackUrl), listener.wait()]);

    expect(response.status).toBe(200);
    expect(result).toEqual({
      code: 'oauth1-verifier',
      state: listener.state,
      callbackParams: {
        state: listener.state,
        oauth_verifier: 'oauth1-verifier',
        oauth_token: 'request-token'
      }
    });
  });

  it('continues to resolve OAuth 2 code callbacks', async () => {
    let listener = await createOAuthCallbackListener();
    let callbackUrl = new URL(listener.redirectUri);
    callbackUrl.search = new URLSearchParams({
      state: listener.state,
      code: 'oauth2-code'
    }).toString();

    let [response, result] = await Promise.all([fetch(callbackUrl), listener.wait()]);

    expect(result).toMatchObject({
      code: 'oauth2-code',
      state: listener.state,
      callbackParams: { state: listener.state, code: 'oauth2-code' }
    });
    expect(response.status).toBe(200);
  });

  it('rejects callbacks without state', async () => {
    let listener = await createOAuthCallbackListener();
    let callbackUrl = new URL(listener.redirectUri);
    callbackUrl.search = new URLSearchParams({ code: 'oauth2-code' }).toString();

    let result = expect(listener.wait()).rejects.toThrow(
      'OAuth callback did not include the required query parameters.'
    );
    let response = await fetch(callbackUrl);

    expect(response.status).toBe(400);
    await result;
  });

  it('rejects OAuth error callbacks', async () => {
    let listener = await createOAuthCallbackListener();
    let callbackUrl = new URL(listener.redirectUri);
    callbackUrl.search = new URLSearchParams({
      state: listener.state,
      error: 'access_denied',
      error_description: 'The user denied access.',
      error_uri: 'https://example.com/oauth-error'
    }).toString();

    let result = expect(listener.wait()).rejects.toThrow(
      'OAuth callback returned "access_denied": The user denied access. (https://example.com/oauth-error)'
    );
    let response = await fetch(callbackUrl);

    expect(response.status).toBe(400);
    await result;
  });
});
