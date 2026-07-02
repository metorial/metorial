import { describe, expect, it } from 'vitest';
import { __traceInternals } from './trace';

let {
  sanitizeFreeText,
  sanitizeUrl,
  sanitizeHeaders,
  isSafeHeaderName,
  isSecretKeyName,
  isUrlFormSecretKeyName,
  redactStructuredValue
} = __traceInternals;

describe('isSecretKeyName (structured keys)', () => {
  let secretLike = [
    'authorization',
    'Authorization',
    'proxy-authorization',
    'x-api-key',
    'X-Api-Key',
    'apikey',
    'api_key',
    'api.key',
    'access_token',
    'refresh-token',
    'id_token',
    'client_secret',
    'client-secret',
    'consumer_secret',
    'private_key',
    'privateKey',
    'webhook-signing-secret',
    'auth_code',
    'authorization_code',
    'code_verifier',
    'code_challenge',
    'password',
    'passwd',
    'pwd',
    'passphrase',
    'pin',
    'passcode',
    'secret',
    'credentials',
    'creds',
    'x-auth',
    'x-csrf-token',
    'x-xsrf-token',
    'jwt',
    'session-id',
    'sid',
    'cookie',
    'set-cookie',
    'x-hub-signature',
    'signature',
    'x-sig',
    'hmac',
    'salt',
    'nonce',
    'otp',
    'totp',
    'mfa',
    '2fa',
    'verification-code',
    'sms_code',
    'mnemonic',
    'recovery-key',
    'card_number',
    'cvv',
    'cvc',
    'ssn',
    'orgname_access_token',
    'my.private.key'
  ];

  let nonSecretLike = [
    'accept',
    'content-type',
    'user-agent',
    'etag',
    'location',
    'retry-after',
    'x-request-id',
    'configure',
    'config',
    'design',
    'signal',
    'assignment',
    'condescend',
    'code',
    'status-code',
    'error-code',
    'http-code',
    'status',
    'encode',
    'decoder',
    'object-key',
    'partition-key',
    'sort-key',
    'first-name',
    'last-name',
    'email-address',
    'phone',
    'timestamp',
    'created-at',
    'token_type',
    'token-type',
    'grant_type',
    'grant-type',
    'auth_type',
    'auth_method',
    'signature_method',
    'signature_version',
    'key_id',
    'kid',
    'key_name',
    'password_strength'
  ];

  for (let key of secretLike) {
    it(`treats "${key}" as secret`, () => {
      expect(isSecretKeyName(key)).toBe(true);
    });
  }

  for (let key of nonSecretLike) {
    it(`leaves "${key}" alone`, () => {
      expect(isSecretKeyName(key)).toBe(false);
    });
  }
});

describe('isUrlFormSecretKeyName (URL/form keys)', () => {
  it('flags OAuth auth code key', () => {
    expect(isUrlFormSecretKeyName('code')).toBe(true);
  });

  it('does not flag grant_type or token_type', () => {
    expect(isUrlFormSecretKeyName('grant_type')).toBe(false);
    expect(isUrlFormSecretKeyName('token_type')).toBe(false);
  });

  it('does not flag common non-secret keys', () => {
    expect(isUrlFormSecretKeyName('page')).toBe(false);
    expect(isUrlFormSecretKeyName('limit')).toBe(false);
    expect(isUrlFormSecretKeyName('q')).toBe(false);
  });
});

describe('sanitizeFreeText', () => {
  it('redacts Bearer tokens', () => {
    expect(sanitizeFreeText('Authorization: Bearer abc123XYZ==')).toBe(
      'Authorization: Bearer [redacted]'
    );
  });

  it('redacts Basic/Digest/Negotiate schemes', () => {
    expect(sanitizeFreeText('Basic dXNlcjpwdw==')).toBe('Basic [redacted]');
    expect(sanitizeFreeText('Digest abcdef123456')).toBe('Digest [redacted]');
    expect(sanitizeFreeText('Negotiate YIIFigYGKwYB')).toBe('Negotiate [redacted]');
  });

  it('redacts JWT tokens by value', () => {
    let jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    expect(sanitizeFreeText(`token=${jwt}`)).not.toContain(jwt);
    expect(sanitizeFreeText(`user said: ${jwt} ok`)).toContain('[redacted]');
    expect(sanitizeFreeText(`user said: ${jwt} ok`)).not.toContain(jwt);
  });

  it('redacts AWS access key IDs', () => {
    let key = 'AKIAIOSFODNN7EXAMPLE';
    expect(sanitizeFreeText(`AWS key ${key} embedded`)).not.toContain(key);
  });

  it('redacts GitHub tokens', () => {
    let token = `ghp_${'a'.repeat(40)}`;
    expect(sanitizeFreeText(token)).toBe('[redacted]');
  });

  it('redacts Slack tokens', () => {
    let token = 'xoxb-1234567890-abcdefghij';
    expect(sanitizeFreeText(`token=${token}`)).not.toContain(token);
  });

  it('redacts Stripe secret keys', () => {
    let key = `sk_live_${'a'.repeat(24)}`;
    expect(sanitizeFreeText(`{"key":"${key}"}`)).not.toContain(key);
  });

  it('redacts OpenAI API keys', () => {
    let key = `sk-proj-${'a'.repeat(40)}`;
    expect(sanitizeFreeText(key)).toBe('[redacted]');
  });

  it('redacts Anthropic API keys', () => {
    let key = `sk-ant-${'a'.repeat(40)}`;
    expect(sanitizeFreeText(key)).toBe('[redacted]');
  });

  it('redacts Google API keys', () => {
    let key = `AIza${'a'.repeat(35)}`;
    expect(sanitizeFreeText(key)).toBe('[redacted]');
  });

  it('redacts PEM private key blocks', () => {
    let pem =
      '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----';
    let input = `key: ${pem}`;
    let redacted = sanitizeFreeText(input);
    expect(redacted).not.toContain('MIIEpAIBAAK');
    expect(redacted).toContain('[redacted]');
  });

  it('redacts form-encoded OAuth auth code', () => {
    expect(
      sanitizeFreeText('grant_type=authorization_code&code=abc123&client_secret=xyz')
    ).toBe('grant_type=authorization_code&code=[redacted]&client_secret=[redacted]');
  });

  it('redacts form-encoded client_secret without touching grant_type', () => {
    expect(sanitizeFreeText('grant_type=password&password=hunter2')).toBe(
      'grant_type=password&password=[redacted]'
    );
  });

  it('redacts JSON api_key / secret / token values in stringified JSON', () => {
    let input = JSON.stringify({
      api_key: 'abc',
      access_token: 'tkn',
      refresh_token: 'ref',
      signature: 'sig',
      nested: 'ok'
    });
    let out = sanitizeFreeText(input);
    expect(out).toContain('"api_key":"[redacted]"');
    expect(out).toContain('"access_token":"[redacted]"');
    expect(out).toContain('"refresh_token":"[redacted]"');
    expect(out).toContain('"signature":"[redacted]"');
    expect(out).toContain('"nested":"ok"');
  });

  it('does not redact innocuous key=value pairs', () => {
    expect(sanitizeFreeText('page=2&limit=10')).toBe('page=2&limit=10');
  });
});

describe('sanitizeUrl', () => {
  it('redacts common secret query params', () => {
    expect(
      sanitizeUrl('https://example.com/cb?api_key=abc&client_secret=def&visible=yes')
    ).toBe('https://example.com/cb?api_key=[redacted]&client_secret=[redacted]&visible=yes');
  });

  it('redacts OAuth auth code in query', () => {
    expect(sanitizeUrl('https://example.com/cb?code=abc&state=xyz')).toBe(
      'https://example.com/cb?code=[redacted]&state=xyz'
    );
  });

  it('strips basic auth userinfo', () => {
    expect(sanitizeUrl('https://user:pass@example.com/api?foo=bar')).toBe(
      'https://example.com/api?foo=bar'
    );
  });

  it('redacts secrets embedded in URL fragment (OAuth implicit flow)', () => {
    let input = 'https://example.com/cb#access_token=xyz&token_type=bearer&expires_in=3600';
    let out = sanitizeUrl(input);
    expect(out).toContain('access_token=[redacted]');
    expect(out).toContain('token_type=bearer');
    expect(out).toContain('expires_in=3600');
  });

  it('leaves innocuous URLs unchanged', () => {
    expect(sanitizeUrl('https://example.com/api?page=2&limit=10')).toBe(
      'https://example.com/api?page=2&limit=10'
    );
  });
});

describe('sanitizeHeaders', () => {
  it('drops headers with secret-like names', () => {
    let sanitized = sanitizeHeaders({
      authorization: 'Bearer xyz',
      'x-api-key': 'key',
      'x-auth-token': 'tkn',
      'x-csrf-token': 'csrf',
      cookie: 'session=abc',
      'set-cookie': 'session=abc',
      'x-hub-signature': 'sig',
      'x-auth-code': 'code'
    });
    expect(sanitized).toBeUndefined();
  });

  it('keeps safe headers and redacts tokens in their values', () => {
    let sanitized = sanitizeHeaders({
      'content-type': 'application/json',
      accept: 'application/json',
      'user-agent': 'test-agent',
      'x-request-id': 'req-123'
    });
    expect(sanitized).toEqual({
      'content-type': 'application/json',
      accept: 'application/json',
      'user-agent': 'test-agent',
      'x-request-id': 'req-123'
    });
  });

  it('redacts JWTs/secret tokens that leak into safe header values', () => {
    let jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJKb2huIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    let sanitized = sanitizeHeaders({
      'user-agent': `my-app/${jwt}`
    });
    expect(sanitized?.['user-agent']).not.toContain(jwt);
    expect(sanitized?.['user-agent']).toContain('[redacted]');
  });
});

describe('isSafeHeaderName', () => {
  it('rejects common compound secret header names', () => {
    expect(isSafeHeaderName('x-amz-security-token')).toBe(false);
    expect(isSafeHeaderName('x-org-api-key')).toBe(false);
    expect(isSafeHeaderName('authorization')).toBe(false);
    expect(isSafeHeaderName('x-auth-code')).toBe(false);
    expect(isSafeHeaderName('x-webhook-secret')).toBe(false);
  });

  it('does not falsely reject look-alike names', () => {
    expect(isSafeHeaderName('x-correlation-id')).toBe(true);
    expect(isSafeHeaderName('content-type')).toBe(true);
  });

  it('allows ratelimit-* families', () => {
    expect(isSafeHeaderName('ratelimit-remaining')).toBe(true);
    expect(isSafeHeaderName('x-ratelimit-reset')).toBe(true);
  });
});

describe('redactStructuredValue', () => {
  it('replaces secret-named fields with [redacted]', () => {
    let out = redactStructuredValue({
      api_key: 'abc',
      accessToken: 'xyz',
      nested: { client_secret: 'nested-secret', other: 'visible' },
      list: ['a', 'b']
    });

    expect(out).toEqual({
      api_key: '[redacted]',
      accessToken: '[redacted]',
      nested: { client_secret: '[redacted]', other: 'visible' },
      list: ['a', 'b']
    });
  });

  it('scrubs JWT values inside unrelated fields', () => {
    let jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJKb2huIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    let out = redactStructuredValue({ message: `user: ${jwt}` }) as { message: string };
    expect(out.message).not.toContain(jwt);
    expect(out.message).toContain('[redacted]');
  });

  it('does not redact HTTP status code integers', () => {
    let out = redactStructuredValue({ error: 'not_found', code: 404 });
    expect(out).toEqual({ error: 'not_found', code: 404 });
  });

  it('preserves arrays and numerics', () => {
    let out = redactStructuredValue([1, 'two', { three: 3 }]);
    expect(out).toEqual([1, 'two', { three: 3 }]);
  });
});
