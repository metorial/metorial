import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let networkMocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  request: vi.fn()
}));

vi.mock('node:dns/promises', () => ({ lookup: networkMocks.lookup }));
vi.mock('node:https', () => ({ request: networkMocks.request }));

import {
  isPublicIpAddress,
  probeSourceUrl,
  readSourceUrlChunk,
  validateSourceUrl
} from './source-url';

type QueuedResponse = {
  body?: Buffer;
  headers?: Record<string, string>;
  statusCode: number;
};

let queuedResponses: QueuedResponse[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  queuedResponses = [];
  networkMocks.lookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
  networkMocks.request.mockImplementation((url: URL, options: any, callback: any) => {
    let request = new EventEmitter() as EventEmitter & {
      destroy: ReturnType<typeof vi.fn>;
      end: () => void;
      setTimeout: ReturnType<typeof vi.fn>;
    };
    request.destroy = vi.fn();
    request.setTimeout = vi.fn();
    request.end = () => {
      let queued = queuedResponses.shift();
      if (!queued) throw new Error('No queued HTTPS response');
      let response = Readable.from(queued.body ? [queued.body] : []) as Readable & {
        headers: Record<string, string>;
        statusCode: number;
      };
      response.headers = queued.headers ?? {};
      response.statusCode = queued.statusCode;
      callback(response);
    };

    options.lookup(url.hostname, {}, (error: unknown, address: string, family: number) => {
      expect(error).toBeNull();
      expect(address).toBe('8.8.8.8');
      expect(family).toBe(4);
    });
    return request;
  });
});

describe('YouTube source URL security', () => {
  it('accepts public HTTPS URLs without credentials and strips fragments', () => {
    expect(validateSourceUrl('https://media.example.com/video.mp4#ignored').toString()).toBe(
      'https://media.example.com/video.mp4'
    );
  });

  it.each([
    'http://media.example.com/video.mp4',
    'https://localhost/video.mp4',
    'https://service.internal/video.mp4',
    'https://user:secret@media.example.com/video.mp4',
    'https://127.0.0.1/video.mp4',
    'https://169.254.169.254/latest/meta-data',
    'https://10.0.0.1/video.mp4'
  ])('rejects unsafe source URL %s', value => {
    expect(() => validateSourceUrl(value)).toThrow();
  });

  it('classifies public and reserved IP address ranges', () => {
    expect(isPublicIpAddress('8.8.8.8')).toBe(true);
    expect(isPublicIpAddress('2606:4700:4700::1111')).toBe(true);
    expect(isPublicIpAddress('192.168.1.1')).toBe(false);
    expect(isPublicIpAddress('100.64.0.1')).toBe(false);
    expect(isPublicIpAddress('2001:db8::1')).toBe(false);
    expect(isPublicIpAddress('::1')).toBe(false);
  });

  it('rejects IPv4-embedding IPv6 transition prefixes', () => {
    // 6to4 (2002::/16) embedding 10.0.0.1 and 192.168.1.1.
    expect(isPublicIpAddress('2002:0a00:0001::')).toBe(false);
    expect(isPublicIpAddress('2002:c0a8:101::1')).toBe(false);
    // Teredo (2001::/32).
    expect(isPublicIpAddress('2001::1')).toBe(false);
    expect(isPublicIpAddress('2001:0:5ef5:79fd:0:59d8:a812:f56e')).toBe(false);
    // Documentation range (2001:db8::/32) stays rejected.
    expect(isPublicIpAddress('2001:db8::10.0.0.1')).toBe(false);
    // NAT64 well-known prefix (64:ff9b::/96) embedding 10.0.0.1.
    expect(isPublicIpAddress('64:ff9b::a00:1')).toBe(false);
    expect(isPublicIpAddress('64:ff9b::10.0.0.1')).toBe(false);
    // Non-transition 2001::/16 space stays public (Google Public DNS).
    expect(isPublicIpAddress('2001:4860:4860::8888')).toBe(true);
  });

  it('pins a public DNS result and records stable range metadata', async () => {
    queuedResponses.push({
      statusCode: 206,
      headers: {
        'content-range': 'bytes 0-0/5',
        'content-type': 'video/mp4',
        etag: '"stable-video"'
      }
    });

    let result = await probeSourceUrl('https://media.example.com/video.mp4');

    expect(result).toEqual({
      contentLength: 5,
      entityTag: '"stable-video"',
      finalUrl: 'https://media.example.com/video.mp4',
      mimeType: 'video/mp4'
    });
    expect(networkMocks.request.mock.calls[0]?.[1]?.headers).toMatchObject({
      'Accept-Encoding': 'identity',
      Range: 'bytes=0-0'
    });
  });

  it('rejects DNS answers containing a private address before connecting', async () => {
    networkMocks.lookup.mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '127.0.0.1', family: 4 }
    ]);

    await expect(probeSourceUrl('https://media.example.com/video.mp4')).rejects.toThrow(
      'sourceUrl must resolve only to public internet addresses.'
    );
    expect(networkMocks.request).not.toHaveBeenCalled();
  });

  it('revalidates redirects and rejects a redirect target that resolves privately', async () => {
    networkMocks.lookup.mockImplementation(async (hostname: string) => [
      {
        address: hostname === 'metadata.example.com' ? '169.254.169.254' : '8.8.8.8',
        family: 4
      }
    ]);
    queuedResponses.push({
      statusCode: 302,
      headers: { location: 'https://metadata.example.com/video.mp4' }
    });

    await expect(probeSourceUrl('https://media.example.com/video.mp4')).rejects.toThrow(
      'sourceUrl must resolve only to public internet addresses.'
    );
    expect(networkMocks.request).toHaveBeenCalledTimes(1);
  });

  it('rejects compressed and inconsistent range responses', async () => {
    queuedResponses.push({
      statusCode: 206,
      headers: {
        'content-encoding': 'gzip',
        'content-range': 'bytes 0-0/5',
        'content-type': 'video/mp4'
      }
    });
    await expect(probeSourceUrl('https://media.example.com/video.mp4')).rejects.toThrow(
      'sourceUrl must return an uncompressed byte representation.'
    );

    queuedResponses.push({
      statusCode: 206,
      headers: {
        'content-range': 'bytes 0-1/5',
        'content-type': 'video/mp4'
      }
    });
    await expect(probeSourceUrl('https://media.example.com/video.mp4')).rejects.toThrow(
      'sourceUrl must support HTTP byte ranges'
    );
  });

  it('reads only an exact range from the same media representation', async () => {
    queuedResponses.push({
      statusCode: 206,
      headers: {
        'content-range': 'bytes 1-3/5',
        'content-type': 'video/mp4'
      },
      body: Buffer.from('123')
    });

    let content = await readSourceUrlChunk(
      {
        contentLength: 5,
        entityTag: '"stable-video"',
        finalUrl: 'https://media.example.com/video.mp4',
        mimeType: 'video/mp4'
      },
      1,
      3
    );

    expect(content.toString()).toBe('123');
    expect(networkMocks.request.mock.calls[0]?.[1]?.headers).toMatchObject({
      'If-Match': '"stable-video"',
      Range: 'bytes=1-3'
    });
  });
});
