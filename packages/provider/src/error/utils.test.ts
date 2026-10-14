import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { AuthConfigSecretRedactor } from '../auth/redact';
import { SlateContext } from '../context/context';
import { runWithContext } from '../context/hook';
import { SlateError } from './base';
import {
  BAGGAGE_MAX_SERIALIZED_SIZE,
  BAGGAGE_REDACTED_VALUE,
  BAGGAGE_RESPONSE_MAX_DEPTH,
  BAGGAGE_TRUNCATED_VALUE,
  ERROR_TEXT_MAX_LENGTH,
  sanitizeErrorText,
  sanitizeForBaggage
} from './utils';

let testLogger = { debug() {}, error() {}, info() {}, progress() {}, warn() {} } as any;

let contextWithAuth = (auth: Record<string, unknown>) =>
  new SlateContext({}, {}, auth, { key: 'example' } as any, testLogger);

let mixedAuthConfig = {
  token: 'tg-secret-123456',
  accountId: '123456',
  email: 'me@acme.com',
  tokenType: 'Bearer',
  subdomain: 'acme',
  scope: 'read',
  expiresAt: '2026-10-13T12:00:00.000Z',
  clientId: '0oa1b2c3d4e5f6g7h8i9'
};

let nest = (levels: number, leaf: unknown): unknown => {
  let value = leaf;
  for (let i = 0; i < levels; i++) value = { [`level${levels - i}`]: value };
  return value;
};

let graphqlErrorBody = {
  errors: [
    {
      message: 'Argument Validation Error',
      path: ['issueCreate'],
      extensions: {
        code: 'INVALID_INPUT',
        userPresentableMessage: 'Team is required',
        validationErrors: [{ field: 'teamId', message: 'must not be empty' }]
      }
    }
  ]
};

describe('sanitizeForBaggage', () => {
  it('keeps the default depth limit for generic baggage values', () => {
    expect(sanitizeForBaggage(nest(5, 'deep'))).toEqual({
      level1: { level2: { level3: { level4: BAGGAGE_TRUNCATED_VALUE } } }
    });
  });

  it('preserves nested provider error details at the response depth', () => {
    expect(sanitizeForBaggage(graphqlErrorBody)).toMatchObject({
      errors: [{ extensions: { code: BAGGAGE_TRUNCATED_VALUE } }]
    });

    expect(
      sanitizeForBaggage(graphqlErrorBody, { maxDepth: BAGGAGE_RESPONSE_MAX_DEPTH })
    ).toEqual(graphqlErrorBody);

    let quickbooksFault = {
      Fault: {
        Error: [
          { Message: 'Invalid Reference Id', Detail: 'Account 99 not found', code: '2500' }
        ],
        type: 'ValidationFault'
      }
    };
    expect(
      sanitizeForBaggage(quickbooksFault, { maxDepth: BAGGAGE_RESPONSE_MAX_DEPTH })
    ).toEqual(quickbooksFault);

    expect(
      sanitizeForBaggage(nest(BAGGAGE_RESPONSE_MAX_DEPTH + 1, 'deep'), {
        maxDepth: BAGGAGE_RESPONSE_MAX_DEPTH
      })
    ).toEqual(nest(BAGGAGE_RESPONSE_MAX_DEPTH, BAGGAGE_TRUNCATED_VALUE));
  });

  it('redacts secret-named keys at every depth', () => {
    let sanitized = sanitizeForBaggage(
      {
        access_token: 'at-123',
        nested: {
          errors: [
            {
              extensions: {
                refreshToken: 'rt-123',
                client_secret: 'cs-123',
                githubToken: 'gh-123',
                session: { id: 's-1' },
                headers: { Authorization: 'Bearer abc', Cookie: 'sid=1' },
                password: 'hunter2',
                'x-api-key': 'key-123',
                private_key: 'pk-123',
                token_type: 'bearer',
                code: 'BAD_INPUT',
                message: 'kept'
              }
            }
          ]
        }
      },
      { maxDepth: BAGGAGE_RESPONSE_MAX_DEPTH }
    ) as any;

    let extensions = sanitized.nested.errors[0].extensions;
    expect(sanitized.access_token).toBe(BAGGAGE_REDACTED_VALUE);
    expect(extensions).toMatchObject({
      refreshToken: BAGGAGE_REDACTED_VALUE,
      client_secret: BAGGAGE_REDACTED_VALUE,
      githubToken: BAGGAGE_REDACTED_VALUE,
      session: BAGGAGE_REDACTED_VALUE,
      password: BAGGAGE_REDACTED_VALUE,
      'x-api-key': BAGGAGE_REDACTED_VALUE,
      private_key: BAGGAGE_REDACTED_VALUE,
      token_type: 'bearer',
      code: 'BAD_INPUT',
      message: 'kept'
    });
    expect(extensions.headers).toEqual({
      Authorization: BAGGAGE_REDACTED_VALUE,
      Cookie: BAGGAGE_REDACTED_VALUE
    });
    expect(JSON.stringify(sanitized)).not.toMatch(/at-123|rt-123|cs-123|gh-123|hunter2/);
  });

  it('scrubs known credential formats inside string values', () => {
    let jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.c2lnbmF0dXJlLXZhbHVl';
    let sanitized = sanitizeForBaggage({
      detail: `Rejected Authorization: Bearer ${jwt}`,
      hint: 'retry with api_key=abcdef123456'
    }) as Record<string, string>;

    expect(sanitized.detail).not.toContain(jwt);
    expect(sanitized.hint).toBe('retry with api_key=[redacted]');
  });

  it('keeps ordinary error prose intact', () => {
    let messages = [
      'Invalid token provided',
      'token expired',
      'Basic plan required for this feature',
      'Digest authentication failed',
      'Request failed with error code=404',
      'The access token has been revoked for organizationAdministrators'
    ];

    expect(sanitizeForBaggage({ messages })).toEqual({ messages });
  });

  it('does not throw for values with throwing getters or proxy traps', () => {
    let throwingGetter = {
      get detail() {
        throw new Error('boom');
      }
    };
    let throwingProxy = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('boom');
        }
      }
    );

    expect(sanitizeForBaggage({ nested: throwingGetter, kept: 'ok' })).toEqual({
      nested: { detail: '[unserializable]' },
      kept: 'ok'
    });
    expect(sanitizeForBaggage(throwingProxy)).toBe('[unserializable]');
    expect(sanitizeForBaggage({ proxy: throwingProxy, kept: 'ok' })).toEqual({
      proxy: '[unserializable]',
      kept: 'ok'
    });
  });

  it('keeps flags, counts, cursors, and descriptors under secret-sounding keys', () => {
    let value = {
      pageToken: 'cursor-abc123',
      nextPageToken: 'cursor-def456',
      next_page_token: 'cursor-ghi789',
      tokenCount: 12,
      tokenLimit: 100,
      sessionTimeout: 30,
      sessionExpired: true,
      authError: 'invalid_grant',
      signatureValid: false,
      authorizationUrl: 'https://auth.example.com/authorize',
      token_type: 'bearer',
      token: true,
      secretName: 'prod-db',
      apiKeyId: 'key_123'
    };

    expect(sanitizeForBaggage(value)).toEqual(value);
  });

  it('still redacts credential-bearing keys after the suffix allowlist', () => {
    let sanitized = sanitizeForBaggage({
      access_token: 'a',
      refresh_token: 'b',
      id_token: 'c',
      apiKey: 'd',
      api_key: 'e',
      client_secret: 'f',
      password: 'g',
      secret: 'h',
      authorization: 'i',
      cookie: 'j',
      'x-api-key': 'k',
      sessionToken: 'l',
      privateKey: 'm',
      sessionId: 'n',
      session_id: 'o',
      pin: 1234,
      cvv: 123
    }) as Record<string, unknown>;

    for (let value of Object.values(sanitized)) expect(value).toBe(BAGGAGE_REDACTED_VALUE);
  });

  it('keeps validation messages under secret-named fields but not passphrases', () => {
    let sanitized = sanitizeForBaggage(
      {
        errors: {
          password: 'is too short (minimum is 8 characters)',
          token: ['This field is required.'],
          api_key: ['The api key must be at least 32 characters.']
        },
        passphrase: 'correct horse battery staple',
        secret: 'hunter2 is required',
        client_secret: ['abc', 'This field is required.'],
        refresh_token: `required ${'x'.repeat(40)} token`
      },
      { maxDepth: BAGGAGE_RESPONSE_MAX_DEPTH }
    );

    expect(sanitized).toEqual({
      errors: {
        password: 'is too short (minimum is 8 characters)',
        token: ['This field is required.'],
        api_key: ['The api key must be at least 32 characters.']
      },
      passphrase: BAGGAGE_REDACTED_VALUE,
      secret: BAGGAGE_REDACTED_VALUE,
      client_secret: BAGGAGE_REDACTED_VALUE,
      refresh_token: BAGGAGE_REDACTED_VALUE
    });
  });

  it('charges undefined array items and stores bigints as strings', () => {
    expect(
      sanitizeForBaggage({ list: [1, undefined, 2], big: 12345678901234567890n })
    ).toEqual({
      list: [1, null, 2],
      big: '12345678901234567890'
    });
    expect(() => JSON.stringify(sanitizeForBaggage({ big: 1n }))).not.toThrow();

    let sparse = sanitizeForBaggage(
      Array.from({ length: 20 }, () => undefined),
      {
        maxSerializedSize: 30
      }
    );
    expect(JSON.stringify(sparse).length).toBeLessThanOrEqual(30 + 8);
  });

  it('skips a key that overflows the budget but keeps later keys that fit', () => {
    let sanitized = sanitizeForBaggage(
      { [`k${'x'.repeat(200)}`]: 1, short: 'ok' },
      { maxSerializedSize: 64 }
    );
    expect(sanitized).toEqual({ short: 'ok' });
  });

  it('redacts literal auth-config secrets inside a Slate context', async () => {
    let context = new SlateContext(
      {},
      {},
      { token: 'tg-secret-123456', region: 'eu' },
      { key: 'example' } as any,
      { debug() {}, error() {}, info() {}, progress() {}, warn() {} } as any
    );

    let sanitized = await runWithContext(context, async () =>
      sanitizeForBaggage({
        echoed: 'tg-secret-123456',
        detail: 'request to /bottg-secret-123456/getMe failed',
        region: 'eu'
      })
    );

    expect(JSON.stringify(sanitized)).not.toContain('tg-secret-123456');
    // Only secret-named auth-config fields are replaced; `region` stays readable.
    expect(sanitized).toMatchObject({ region: 'eu' });
    expect(sanitizeForBaggage({ echoed: 'tg-secret-123456' })).toEqual({
      echoed: 'tg-secret-123456'
    });
  });

  it('caps strings, arrays, and object keys', () => {
    let sanitized = sanitizeForBaggage({
      text: 'x'.repeat(5_000),
      list: Array.from({ length: 50 }, (_, i) => i),
      wide: Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`k${i}`, i]))
    }) as { text: string; list: number[]; wide: Record<string, number> };

    expect(sanitized.text).toBe(`${'x'.repeat(2_000)}...[truncated]`);
    expect(sanitized.list).toHaveLength(20);
    expect(Object.keys(sanitized.wide)).toHaveLength(30);
  });

  it('bounds the serialized size of large nested bodies', () => {
    let leaf = 'y'.repeat(3_000);
    // Children are shared by reference so the input stays small in memory while
    // its logical size (40^8 leaves) is enormous.
    let wide = (levels: number): unknown => {
      if (levels === 0) return leaf;
      let child = wide(levels - 1);
      return Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`k${i}`, child]));
    };

    let sanitized = sanitizeForBaggage(wide(BAGGAGE_RESPONSE_MAX_DEPTH - 1), {
      maxDepth: BAGGAGE_RESPONSE_MAX_DEPTH
    });
    let size = JSON.stringify(sanitized).length;

    expect(size).toBeGreaterThan(BAGGAGE_MAX_SERIALIZED_SIZE * 0.9);
    expect(size).toBeLessThanOrEqual(BAGGAGE_MAX_SERIALIZED_SIZE + 256);
    expect(JSON.stringify(sanitized).includes('...[truncated]')).toBe(true);

    let escaped = sanitizeForBaggage(Array.from({ length: 20 }, () => '\u0001'.repeat(2_000)));
    expect(JSON.stringify(escaped).length).toBeLessThanOrEqual(
      BAGGAGE_MAX_SERIALIZED_SIZE + 256
    );
  });

  it('does not let __proto__ keys change the prototype', () => {
    let sanitized = sanitizeForBaggage(JSON.parse('{"__proto__": {"polluted": true}}'));
    expect(Object.getPrototypeOf(sanitized)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('SlateError.fromAxios response baggage', () => {
  it('keeps nested upstream error bodies and redacts secrets in baggage and url', () => {
    let config = {
      url: '/graphql?api_key=secret-key-value&first=10',
      baseURL: 'https://api.example.com',
      method: 'post',
      headers: {}
    } as InternalAxiosRequestConfig;
    let response = {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config,
      data: {
        ...graphqlErrorBody,
        debug: { request: { headers: { authorization: 'Bearer leaked-token' } } }
      }
    } as AxiosResponse;

    let error = SlateError.fromAxios(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response)
    );

    expect(error.data.baggage?.response).toMatchObject({
      errors: [
        {
          extensions: {
            code: 'INVALID_INPUT',
            validationErrors: [{ field: 'teamId', message: 'must not be empty' }]
          }
        }
      ],
      debug: { request: { headers: { authorization: BAGGAGE_REDACTED_VALUE } } }
    });
    expect(error.data.upstream?.url).toBe(
      'https://api.example.com/graphql?api_key=[redacted]&first=10'
    );
    expect(JSON.stringify(error.toResponse())).not.toMatch(/leaked-token|secret-key-value/);
  });

  it('redacts auth-config secrets embedded in URL paths and upstream messages', async () => {
    let token = '123456:ABCdefGHIjklMNOpqrSTU';
    let context = new SlateContext(
      {},
      {},
      { token },
      { key: 'telegram' } as any,
      { debug() {}, error() {}, info() {}, progress() {}, warn() {} } as any
    );
    let config = {
      url: 'sendMessage',
      baseURL: `https://api.telegram.org/bot${token}/`,
      method: 'post',
      headers: {}
    } as InternalAxiosRequestConfig;
    let response = {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config,
      data: {
        description: `Unauthorized: token ${token} rejected; Authorization: Bearer abc`,
        echoed: { value: token }
      }
    } as AxiosResponse;

    let error = await runWithContext(context, async () =>
      SlateError.fromAxios(
        new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response)
      )
    );

    expect(error.data.upstream?.url).toMatch(
      /^https:\/\/api\.telegram\.org\/bot\$\$MT\$secret\$authConfig\$token\$\$\/sendMessage$/
    );
    expect(error.data.message).toBe(
      'Unauthorized: token $$MT$secret$authConfig$token$$ rejected; Authorization: Bearer [redacted]'
    );
    expect(JSON.stringify(error.toResponse())).not.toContain(token);
    expect(JSON.stringify(error.toResponse())).not.toContain('ABCdefGHI');
  });

  it('scrubs credentials from inferred messages without a context and keeps prose', () => {
    let build = (description: string) => {
      let config = { url: '/x', baseURL: 'https://api.example.com', headers: {} } as any;
      let response = {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config,
        data: { description }
      } as AxiosResponse;
      return SlateError.fromAxios(
        new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response)
      ).data.message;
    };

    expect(build("Rejected {'access_token': 'abc'}")).toBe(
      "Rejected {'access_token': '[redacted]'}"
    );
    expect(build('Invalid token provided')).toBe('Invalid token provided');
    expect(build('Request failed with error code=404')).toBe(
      'Request failed with error code=404'
    );
    expect(build('x'.repeat(5_000))).toHaveLength(2_003);
  });
});

describe('auth-config literal redaction scope', () => {
  it('keeps non-secret auth-config values in baggage, error text, and URLs', async () => {
    let context = contextWithAuth(mixedAuthConfig);
    let body = {
      accountId: '123456',
      email: 'me@acme.com',
      type: 'Bearer',
      subdomain: 'acme',
      scope: 'read',
      expiresAt: '2026-10-13T12:00:00.000Z',
      clientId: '0oa1b2c3d4e5f6g7h8i9',
      detail: 'workspace acme (account 123456) for me@acme.com',
      echoed: 'tg-secret-123456'
    };

    let sanitized = await runWithContext(context, async () => sanitizeForBaggage(body));
    expect(sanitized).toEqual({
      ...body,
      echoed: '$$MT$secret$authConfig$token'
    });

    let message = await runWithContext(context, async () =>
      sanitizeErrorText('Subdomain acme not found for account 123456; token tg-secret-123456')
    );
    expect(message).toBe(
      'Subdomain acme not found for account 123456; token $$MT$secret$authConfig$token$$'
    );

    let config = {
      url: '/accounts?account_id=123456&scope=read&email=me@acme.com',
      baseURL: 'https://acme.example.com',
      method: 'get',
      headers: {}
    } as InternalAxiosRequestConfig;
    let response = {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config,
      data: { message: 'acme' }
    } as AxiosResponse;
    let error = await runWithContext(context, async () =>
      SlateError.fromAxios(
        new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response)
      )
    );

    expect(error.data.message).toBe('acme');
    expect(error.data.upstream?.url).toBe(
      'https://acme.example.com/accounts?account_id=123456&scope=read&email=me@acme.com'
    );
  });

  it('redacts camelCase and snake_case secret auth fields embedded in text', () => {
    let redactor = new AuthConfigSecretRedactor({
      apiSecret: 'api-secret-value-1',
      accessKey: 'access-key-value-2',
      botToken: 'bot-token-value-3',
      githubToken: 'github-token-value-4',
      client_secret: 'client-secret-value-5',
      subscriptionKey: 'subscription-key-6',
      oauth: { refreshToken: 'nested-refresh-7' }
    });

    let text = sanitizeErrorText(
      'got api-secret-value-1, access-key-value-2, bot-token-value-3, github-token-value-4, ' +
        'client-secret-value-5, subscription-key-6, nested-refresh-7',
      redactor
    );

    expect(text).toBe(
      'got $$MT$secret$authConfig$apiSecret$$, $$MT$secret$authConfig$accessKey$$, ' +
        '$$MT$secret$authConfig$botToken$$, $$MT$secret$authConfig$githubToken$$, ' +
        '$$MT$secret$authConfig$client_secret$$, $$MT$secret$authConfig$subscriptionKey$$, ' +
        '$$MT$secret$authConfig$oauth.refreshToken$$'
    );
  });

  it('still replaces a secret value shared with a non-secret field', () => {
    let redactor = new AuthConfigSecretRedactor({
      token: 'shared-value',
      username: 'shared-value'
    });
    expect(sanitizeForBaggage({ echoed: 'shared-value' }, { redactor })).toEqual({
      echoed: '$$MT$secret$authConfig$token'
    });
  });
});

describe('sanitizeErrorText', () => {
  it('uses the context redactor for undefined and skips it for null', async () => {
    let context = contextWithAuth({ token: 'tg-secret-123456' });

    await runWithContext(context, async () => {
      expect(sanitizeErrorText('bad tg-secret-123456')).toBe(
        'bad $$MT$secret$authConfig$token$$'
      );
      expect(sanitizeErrorText('bad tg-secret-123456', null)).toBe('bad tg-secret-123456');
    });
  });

  it('caps its input and redacts credentials straddling the cut', () => {
    let huge = sanitizeErrorText('x'.repeat(200_000));
    expect(huge).toBe(`${'x'.repeat(ERROR_TEXT_MAX_LENGTH)}...[truncated]`);

    let key = `sk_live_${'a'.repeat(24)}`;
    let straddling = sanitizeErrorText(
      `${'y'.repeat(ERROR_TEXT_MAX_LENGTH - 5)} ${key} ${'z'.repeat(1_000)}`
    );
    expect(straddling).not.toContain('sk_li');
    expect(straddling.endsWith('...[truncated]')).toBe(true);

    let pairs = 'a=b '.repeat(50_000);
    let started = Date.now();
    sanitizeErrorText(pairs, null);
    expect(Date.now() - started).toBeLessThan(1_000);
  });
});

describe('sanitizeForBaggage secret key classification', () => {
  it('redacts session identifiers and secret ids despite the id suffix', () => {
    let sanitized = sanitizeForBaggage({
      userSessionId: 'u1',
      chat_session_ids: ['c1'],
      sess_id: 's0',
      JSESSIONID: 'j1',
      PHPSESSID: 'p1',
      sessid: 's1',
      'ASP.NET_SessionId': 'a1',
      secret_id: 'x1',
      clientSecretId: 'x2'
    }) as Record<string, unknown>;

    for (let value of Object.values(sanitized)) expect(value).toBe(BAGGAGE_REDACTED_VALUE);
  });

  it('keeps non-secret ids and timestamps under secret-sounding keys', () => {
    let value = {
      accountId: 'acc_1',
      tokenId: 'tok_1',
      tokenExpiresAt: '2026-10-13T12:00:00.000Z',
      apiKeyId: 'key_123'
    };
    expect(sanitizeForBaggage(value)).toEqual(value);
  });

  it('redacts numbers under code, secret, and key fields but keeps plain codes and counts', () => {
    let sanitized = sanitizeForBaggage({
      verification_code: 123456,
      mfaCode: 654321,
      auth_code: 1111,
      client_secret: 42,
      api_key: 12345,
      code: 404,
      error_code: 500,
      tokenCount: 3,
      token: 0
    });

    expect(sanitized).toEqual({
      verification_code: BAGGAGE_REDACTED_VALUE,
      mfaCode: BAGGAGE_REDACTED_VALUE,
      auth_code: BAGGAGE_REDACTED_VALUE,
      client_secret: BAGGAGE_REDACTED_VALUE,
      api_key: BAGGAGE_REDACTED_VALUE,
      code: 404,
      error_code: 500,
      tokenCount: 3,
      token: 0
    });
  });
});

describe('SlateError.fromAxios message scrubbing order', () => {
  it('scrubs a credential that straddles the message cap before cutting', () => {
    let config = { url: '/x', baseURL: 'https://api.example.com', headers: {} } as any;
    let response = {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config,
      data: { description: `${'x'.repeat(1_985)} Bearer abcdef123456ghijkl` }
    } as AxiosResponse;

    let message = SlateError.fromAxios(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response)
    ).data.message;

    expect(message).not.toContain('abcdef1');
    expect(message).toHaveLength(2_003);
  });
});
