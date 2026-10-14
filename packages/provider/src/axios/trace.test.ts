import { describe, expect, it } from 'vitest';
import { AuthConfigSecretRedactor } from '../auth/redact';
import {
  __traceInternals,
  redactAuthConfigSecretsInText,
  sanitizeSecretValuesInText
} from './trace';

let {
  sanitizeFreeText,
  sanitizeUrl,
  sanitizeHeaders,
  isSafeHeaderName,
  isSecretKeyName,
  isSecretFieldName,
  isAuthConfigSecretValue,
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

describe('sanitizeSecretValuesInText', () => {
  it('redacts credential header values regardless of length', () => {
    expect(sanitizeSecretValuesInText('Authorization: Bearer abc')).toBe(
      'Authorization: Bearer [redacted]'
    );
    expect(sanitizeSecretValuesInText('proxy-authorization=Basic xyz')).toBe(
      'proxy-authorization=Basic [redacted]'
    );
    expect(sanitizeSecretValuesInText('sent X-API-Key: k1 to server')).toBe(
      'sent X-API-Key: [redacted] to server'
    );
    expect(sanitizeSecretValuesInText('apiKey=short&page=2')).toBe('apiKey=[redacted]&page=2');
    expect(sanitizeSecretValuesInText('Cookie: sid=1; theme=dark next')).toBe(
      'Cookie: [redacted] next'
    );
    expect(sanitizeSecretValuesInText('set-cookie: "sess=abc"')).toBe(
      'set-cookie: "[redacted]"'
    );
  });

  it('redacts 8+ character scheme credentials but keeps prose', () => {
    expect(sanitizeSecretValuesInText('got Bearer abc12345 back')).toBe(
      'got Bearer [redacted] back'
    );
    expect(sanitizeSecretValuesInText('Basic dXNlcjpwYXNz')).toBe('Basic [redacted]');
    expect(sanitizeSecretValuesInText('token a1b2c3d4e5')).toBe('token [redacted]');

    for (let prose of [
      'Invalid token provided',
      'token expired',
      'Basic authentication failed',
      'Bearer Authentication required',
      'Token verification failed',
      'Request failed with error code=404',
      'Invalid token code=404'
    ]) {
      expect(sanitizeSecretValuesInText(prose)).toBe(prose);
    }
  });

  it('redacts single-quoted secret pairs', () => {
    expect(
      sanitizeSecretValuesInText("{'access_token': 'abc', 'token_type': 'bearer', 'ok': 'x'}")
    ).toBe("{'access_token': '[redacted]', 'token_type': 'bearer', 'ok': 'x'}");
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

  it('redacts long auth-config secrets embedded in the path', () => {
    let redactor = new AuthConfigSecretRedactor({
      token: '123456:ABCdefGHIjklMNOpqrSTU',
      botId: '123456',
      applicationId: '1503442063478362305'
    });
    expect(
      sanitizeUrl('https://api.telegram.org/bot123456:ABCdefGHIjklMNOpqrSTU/getMe', redactor)
    ).toBe('https://api.telegram.org/bot$$MT$secret$authConfig$token$$/getMe');
    expect(sanitizeUrl('https://example.com/bots/123456/info', redactor)).toBe(
      'https://example.com/bots/123456/info'
    );
    expect(
      sanitizeUrl(
        'https://discord.com/api/applications/1503442063478362305/commands',
        redactor
      )
    ).toBe('https://discord.com/api/applications/1503442063478362305/commands');
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

describe('isSecretFieldName (split-camelCase classifier)', () => {
  it('matches raw and split camelCase secret keys', () => {
    for (let key of [
      'apiSecret',
      'api_secret',
      'accessKey',
      'access_key',
      'botToken',
      'bot_token',
      'githubToken',
      'github_token',
      'clientSecret',
      'sessionToken',
      'hapikey',
      'JSESSIONID',
      'PHPSESSID',
      'userSessionId',
      'secret_id'
    ]) {
      expect(isSecretFieldName(key), key).toBe(true);
    }
  });

  it('skips descriptors, cursors, and ordinary ids', () => {
    for (let key of [
      'tokenType',
      'tokenCount',
      'tokenExpiresAt',
      'pageToken',
      'accountId',
      'apiKeyId',
      'email',
      'subdomain'
    ]) {
      expect(isSecretFieldName(key), key).toBe(false);
    }
  });
});

describe('isAuthConfigSecretValue (auth-config paths)', () => {
  it('accepts secret-named and credential-role fields', () => {
    expect(isAuthConfigSecretValue('x', 'token')).toBe(true);
    expect(isAuthConfigSecretValue('x', 'oauth.accessToken')).toBe(true);
    expect(isAuthConfigSecretValue('x', 'apiKeys.0')).toBe(true);
    expect(isAuthConfigSecretValue('x', 'subscriptionKey')).toBe(true);
    expect(isAuthConfigSecretValue('x', 'writeKey')).toBe(true);
    expect(isAuthConfigSecretValue('x', 'provisioningHash')).toBe(true);
    expect(isAuthConfigSecretValue('Basic dXNlcjpw', 'authorizationHeader')).toBe(true);
  });

  it('rejects non-secret fields', () => {
    for (let path of [
      'accountId',
      'email',
      'tokenType',
      'subdomain',
      'scope',
      'expiresAt',
      'clientId',
      'region',
      'oauth.tenantId'
    ]) {
      expect(isAuthConfigSecretValue('x', path), path).toBe(false);
    }
    expect(isAuthConfigSecretValue('authorization', 'tokenHeader')).toBe(false);
    expect(isAuthConfigSecretValue('project-access-token', 'tokenHeader')).toBe(false);
  });
});

describe('auth-config literal redaction in traces', () => {
  let redactor = new AuthConfigSecretRedactor({
    token: 'tg-secret-123456',
    pin: '1234',
    accountId: '123456',
    email: 'me@acme.com',
    tokenType: 'Bearer',
    subdomain: 'acme',
    scope: 'read',
    expiresAt: '2026-10-13T12:00:00.000Z'
  });

  it('replaces only secret-named whole values in structured bodies', () => {
    expect(
      redactStructuredValue(
        {
          id: '123456',
          email: 'me@acme.com',
          type: 'Bearer',
          subdomain: 'acme',
          scope: 'read',
          expiresAt: '2026-10-13T12:00:00.000Z',
          echoed: 'tg-secret-123456',
          short: '1234'
        },
        0,
        redactor
      )
    ).toEqual({
      id: '123456',
      email: 'me@acme.com',
      type: 'Bearer',
      subdomain: 'acme',
      scope: 'read',
      expiresAt: '2026-10-13T12:00:00.000Z',
      echoed: '$$MT$secret$authConfig$token',
      short: '$$MT$secret$authConfig$pin'
    });
    expect(sanitizeFreeText('acme', redactor)).toBe('acme');
  });

  it('keeps non-secret query and fragment values but replaces secret ones', () => {
    expect(
      sanitizeUrl(
        'https://acme.example.com/v1?account_id=123456&scope=read&echo=tg-secret-123456#sub=acme',
        redactor
      )
    ).toBe(
      'https://acme.example.com/v1?account_id=123456&scope=read&echo=%24%24MT%24secret%24authConfig%24token#sub=acme'
    );
  });

  it('replaces camelCase secret auth fields embedded in text', () => {
    let camel = new AuthConfigSecretRedactor({
      apiSecret: 'api-secret-value',
      accessKey: 'access-key-value',
      botToken: '123:bot-token-value',
      accountName: 'acme-corporation'
    });
    expect(
      redactAuthConfigSecretsInText(
        'api-secret-value access-key-value /bot123:bot-token-value/ acme-corporation',
        camel
      )
    ).toBe(
      '$$MT$secret$authConfig$apiSecret$$ $$MT$secret$authConfig$accessKey$$ ' +
        '/bot$$MT$secret$authConfig$botToken$$/ acme-corporation'
    );
  });
});

describe('sanitizeSecretValuesInText header schemes', () => {
  it('redacts credentials after any authorization scheme', () => {
    let cases: [string, string][] = [
      ['Authorization: OAuth 00D5g000004XyZ!AQ4AQ', 'Authorization: OAuth [redacted]'],
      ['Authorization: Bot MTk4NjIyNDgzNDcxOTI1MjQ4.Cl2FMQ', 'Authorization: Bot [redacted]'],
      ['Authorization: SSWS 00QCjAl4MlV-WPXM', 'Authorization: SSWS [redacted]'],
      [
        'Authorization: Zoho-oauthtoken 1000.abc.123 rejected',
        'Authorization: Zoho-oauthtoken [redacted] rejected'
      ],
      [
        'authorization: Klaviyo-API-Key pk_abc123',
        'authorization: Klaviyo-API-Key [redacted]'
      ],
      [
        'Authorization: Digest username="Mufasa", realm="x", nonce="dcd98b", response="6629fae49393a05397450978507c4ef1"',
        'Authorization: Digest [redacted]'
      ],
      [
        'Authorization: AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, SignedHeaders=host, Signature=5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7',
        'Authorization: AWS4-HMAC-SHA256 [redacted]'
      ],
      ['Proxy-Authorization: "Custom abc123def"', 'Proxy-Authorization: "Custom [redacted]"'],
      ['Authorization: abc123def please retry', 'Authorization: [redacted] please retry']
    ];

    for (let [input, expected] of cases) {
      expect(sanitizeSecretValuesInText(input), input).toBe(expected);
    }
  });

  it('keeps header-name prose that holds no credential', () => {
    for (let prose of [
      'Authorization: missing or invalid',
      'Authorization: Basic',
      'Missing cookie: please log in',
      'X-API-Key: invalid',
      'api_key: required'
    ]) {
      expect(sanitizeSecretValuesInText(prose), prose).toBe(prose);
    }
  });
});

describe('sanitizeSecretValuesInText prose key: value pairs', () => {
  it('redacts secret-named pairs with credential values', () => {
    let cases: [string, string][] = [
      ['password: Hunter2', 'password: [redacted]'],
      ['access_token: abc', 'access_token: [redacted]'],
      ['refresh_token: 1//0gabc', 'refresh_token: [redacted]'],
      ['sessionToken: FwoGZXIvYXdzEJr', 'sessionToken: [redacted]'],
      ['secret: s3cr3tvalue', 'secret: [redacted]'],
      ['Invalid token: ya29.a0AfH6SMBx.', 'Invalid token: [redacted].'],
      [
        "{ access_token: 'abc', token_type: 'bearer' }",
        "{ access_token: '[redacted]', token_type: 'bearer' }"
      ],
      ['client_secret:"xyz"', 'client_secret:"[redacted]"']
    ];

    for (let [input, expected] of cases) {
      expect(sanitizeSecretValuesInText(input), input).toBe(expected);
    }
  });

  it('keeps state words, non-secret keys, and URLs', () => {
    for (let prose of [
      'token: expired',
      'token: expired.',
      'Error fetching access token: invalid_grant',
      'refresh_token: invalid_grant',
      'password: required',
      'access_token: missing',
      'refresh_token: revoked',
      'Error: Request failed',
      'see https://api.example.com:443/v1',
      'token_type: bearer',
      'tokenCount: 12'
    ]) {
      expect(sanitizeSecretValuesInText(prose), prose).toBe(prose);
    }
  });
});

describe('sanitizeUrl credential query values', () => {
  it('redacts key and hapikey params and known credential formats', () => {
    let googleKey = `AIza${'b'.repeat(35)}`;
    expect(sanitizeUrl(`https://maps.googleapis.com/api?key=${googleKey}&q=x`)).toBe(
      'https://maps.googleapis.com/api?key=[redacted]&q=x'
    );
    expect(sanitizeUrl('https://api.hubapi.com/contacts?hapikey=abc-123')).toBe(
      'https://api.hubapi.com/contacts?hapikey=[redacted]'
    );
    expect(sanitizeUrl(`https://example.com/x?q=sk_live_${'a'.repeat(24)}&page=2`)).toBe(
      'https://example.com/x?q=[redacted]&page=2'
    );
    expect(sanitizeUrl(`https://example.com/x#q=sk_live_${'a'.repeat(24)}`)).toBe(
      'https://example.com/x#q=[redacted]'
    );
    expect(sanitizeUrl(`not a url?q=sk_live_${'a'.repeat(24)}`)).toBe(
      'not a url?q=[redacted]'
    );
  });

  it('keeps compound key params', () => {
    expect(sanitizeUrl('https://example.com/x?sort_key=name&partition_key=p1')).toBe(
      'https://example.com/x?sort_key=name&partition_key=p1'
    );
  });
});
