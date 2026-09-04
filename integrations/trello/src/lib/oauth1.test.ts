import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let httpMocks = vi.hoisted(() => ({
  post: vi.fn()
}));

vi.mock('slates', () => ({
  createAxios: vi.fn(() => ({ post: httpMocks.post }))
}));

import {
  buildOAuth1Header,
  getTrelloAccessToken,
  getTrelloRequestToken,
  normalizeOAuthParameters,
  percentEncode
} from './oauth1';

let readOAuthHeader = (header: string) =>
  Object.fromEntries(
    header
      .slice('OAuth '.length)
      .split(', ')
      .map(part => {
        let match = /^([^=]+)="(.*)"$/.exec(part);
        if (!match) {
          throw new TypeError(`Invalid OAuth header field: ${part}`);
        }
        return [match[1]!, decodeURIComponent(match[2]!)];
      })
  );

beforeEach(() => {
  httpMocks.post.mockReset();
});

describe('Trello OAuth 1.0a signing', () => {
  it.each([
    ['Ladies + Gentlemen', 'Ladies%20%2B%20Gentlemen'],
    ['An encoded string!', 'An%20encoded%20string%21'],
    ['Dogs, Cats & Mice', 'Dogs%2C%20Cats%20%26%20Mice'],
    ['☃', '%E2%98%83'],
    ["!'()*", '%21%27%28%29%2A']
  ])('RFC3986-encodes %j as %j', (input, expected) => {
    expect(percentEncode(input)).toBe(expected);
  });

  it('normalizes encoded names and values while preserving duplicate query keys', () => {
    let normalized = normalizeOAuthParameters([
      ['b5', '=%3D'],
      ['a3', 'a'],
      ['c@', ''],
      ['a2', 'r b'],
      ['oauth_consumer_key', '9djdj82h48djs9d2'],
      ['oauth_token', 'kkk9d7dh3k39sjv7'],
      ['oauth_signature_method', 'HMAC-SHA1'],
      ['oauth_timestamp', '137131201'],
      ['oauth_nonce', '7d8f3e4a'],
      ['c2', ''],
      ['a3', '2 q']
    ]);

    expect(normalized).toBe(
      'a2=r%20b&a3=2%20q&a3=a&b5=%3D%253D&c%40=&c2=&oauth_consumer_key=9djdj82h48djs9d2&oauth_nonce=7d8f3e4a&oauth_signature_method=HMAC-SHA1&oauth_timestamp=137131201&oauth_token=kkk9d7dh3k39sjv7'
    );
  });

  it('matches the RFC 5849 HMAC-SHA1 signature vector', () => {
    let header = buildOAuth1Header(
      'GET',
      'http://photos.example.net/photos?file=vacation.jpg&size=original',
      {
        consumerKey: 'dpf43f3p2l4k3l03',
        consumerSecret: 'kd94hf93k423kf44',
        token: 'nnch734d00sl2jdk',
        tokenSecret: 'pfkkdhi9sl3r4s00',
        nonce: 'kllo9940pd9333jh',
        timestamp: '1191242096'
      }
    );

    expect(readOAuthHeader(header)).toEqual({
      oauth_consumer_key: 'dpf43f3p2l4k3l03',
      oauth_nonce: 'kllo9940pd9333jh',
      oauth_signature: 'tR3+Ty81lMeYAr/Fid0kMTYa/WM=',
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: '1191242096',
      oauth_token: 'nnch734d00sl2jdk',
      oauth_version: '1.0'
    });
  });

  it('includes oauth_callback in request-token headers', () => {
    let header = readOAuthHeader(
      buildOAuth1Header('POST', 'https://trello.com/1/OAuthGetRequestToken', {
        consumerKey: 'consumer-key',
        consumerSecret: 'consumer-secret',
        callbackUrl: 'https://example.com/callback?state=state-123',
        nonce: 'nonce',
        timestamp: '1700000000'
      })
    );

    expect(header.oauth_callback).toBe('https://example.com/callback?state=state-123');
    expect(header.oauth_token).toBeUndefined();
    expect(header.oauth_verifier).toBeUndefined();
  });

  it('includes the temporary token and verifier in access-token headers', () => {
    let header = readOAuthHeader(
      buildOAuth1Header('POST', 'https://trello.com/1/OAuthGetAccessToken', {
        consumerKey: 'consumer-key',
        consumerSecret: 'consumer-secret',
        token: 'request-token',
        tokenSecret: 'request-secret',
        verifier: 'verifier',
        nonce: 'nonce',
        timestamp: '1700000000'
      })
    );

    expect(header.oauth_token).toBe('request-token');
    expect(header.oauth_verifier).toBe('verifier');
    expect(header.oauth_callback).toBeUndefined();
  });
});

describe('Trello OAuth 1.0a token exchange', () => {
  it('parses URL-encoded request-token and access-token responses', async () => {
    httpMocks.post
      .mockResolvedValueOnce({
        data: 'oauth_token=request%20token&oauth_token_secret=request%2Fsecret&oauth_callback_confirmed=true'
      })
      .mockResolvedValueOnce({
        data: 'oauth_token=access%20token&oauth_token_secret=access%2Fsecret'
      });

    await expect(
      getTrelloRequestToken('consumer-key', 'consumer-secret', 'https://example.com/callback')
    ).resolves.toEqual({
      oauthToken: 'request token',
      oauthTokenSecret: 'request/secret'
    });
    await expect(
      getTrelloAccessToken(
        'consumer-key',
        'consumer-secret',
        'request token',
        'request/secret',
        'verifier'
      )
    ).resolves.toEqual({
      oauthToken: 'access token',
      oauthTokenSecret: 'access/secret'
    });
  });

  it.each([
    ['oauth_token_secret=secret&oauth_callback_confirmed=true'],
    ['oauth_token=token&oauth_callback_confirmed=true'],
    ['oauth_token=&oauth_token_secret=secret&oauth_callback_confirmed=true'],
    [
      'oauth_token=token&oauth_token=duplicate&oauth_token_secret=secret&oauth_callback_confirmed=true'
    ]
  ])('rejects a malformed request-token response: %s', async data => {
    httpMocks.post.mockResolvedValueOnce({ data });

    await expect(
      getTrelloRequestToken('consumer-key', 'consumer-secret', 'https://example.com/callback')
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it.each([
    ['oauth_token=token&oauth_token_secret=secret'],
    ['oauth_token=token&oauth_token_secret=secret&oauth_callback_confirmed=false']
  ])('requires an affirmative callback confirmation: %s', async data => {
    httpMocks.post.mockResolvedValueOnce({ data });

    await expect(
      getTrelloRequestToken('consumer-key', 'consumer-secret', 'https://example.com/callback')
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it.each([
    ['oauth_token_secret=access-secret'],
    ['oauth_token=access-token'],
    ['oauth_token=access-token&oauth_token_secret=']
  ])('rejects a malformed access-token response: %s', async data => {
    httpMocks.post.mockResolvedValueOnce({ data });

    await expect(
      getTrelloAccessToken(
        'consumer-key',
        'consumer-secret',
        'request-token',
        'request-secret',
        'verifier'
      )
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('rejects non-text token responses with a Trello ServiceError', async () => {
    httpMocks.post.mockResolvedValueOnce({
      data: { oauth_token: 'token', oauth_token_secret: 'secret' }
    });

    await expect(
      getTrelloRequestToken('consumer-key', 'consumer-secret', 'https://example.com/callback')
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('posts request-token OAuth data only in the Authorization header', async () => {
    httpMocks.post.mockResolvedValueOnce({
      data: 'oauth_token=token&oauth_token_secret=secret&oauth_callback_confirmed=true'
    });

    await getTrelloRequestToken(
      'consumer-key',
      'consumer-secret',
      'https://example.com/callback?state=state-123'
    );

    expect(httpMocks.post).toHaveBeenCalledTimes(1);
    let [url, body, config] = httpMocks.post.mock.calls[0]!;
    expect(url).toBe('https://trello.com/1/OAuthGetRequestToken');
    expect(new URL(url).search).toBe('');
    expect(body).toBeNull();
    let authorization = String(config.headers.Authorization);
    expect(authorization).toContain('oauth_callback=');
    expect(authorization).not.toMatch(/scope|name|expiration/);
    expect(String(body)).not.toMatch(/scope|name|expiration/);
  });

  it('maps upstream request-token failures through the Trello API error contract', async () => {
    httpMocks.post.mockRejectedValueOnce({
      response: {
        status: 401,
        statusText: 'Unauthorized',
        data: 'invalid consumer key'
      }
    });

    let error = await getTrelloRequestToken(
      'consumer-key',
      'consumer-secret',
      'https://example.com/callback'
    ).catch(caught => caught);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data).toMatchObject({
      reason: 'trello_api_error',
      upstreamStatus: 401
    });
    expect(error.data.message).toContain('invalid consumer key');
  });
});
