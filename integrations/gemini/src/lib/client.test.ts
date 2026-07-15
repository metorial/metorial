import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  downloadGet: vi.fn(),
  createAxios: vi.fn()
}));

vi.mock('@slates/provider', async importOriginal => {
  let actual = await importOriginal<typeof import('@slates/provider')>();
  httpMocks.createAxios.mockImplementation((config?: { baseURL?: string }) =>
    config?.baseURL
      ? { get: httpMocks.apiGet, post: httpMocks.apiPost }
      : { get: httpMocks.downloadGet }
  );
  return { ...actual, createAxios: httpMocks.createAxios };
});

import { Client } from './client';

let mp4Bytes = () =>
  Buffer.concat([
    Buffer.from([0, 0, 0, 24]),
    Buffer.from('ftyp', 'ascii'),
    Buffer.from('isom0000', 'ascii')
  ]);

describe('Gemini Client Veo methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts predictLongRunning with the documented Veo request shape', async () => {
    httpMocks.apiPost.mockResolvedValueOnce({
      data: {
        name: 'models/veo-3.1-generate-preview/operations/op-123'
      }
    });
    let client = new Client({ token: 'secret-api-key', apiVersion: 'v1beta' });

    let result = await client.generateVeoVideo('veo-3.1-generate-preview', {
      prompt: 'A cinematic ocean sunrise.',
      image: { mimeType: 'image/png', data: 'aW1hZ2U=' },
      lastFrame: { mimeType: 'image/jpeg', data: 'ZnJhbWU=' },
      aspectRatio: '16:9',
      durationSeconds: 8,
      resolution: '1080p',
      negativePrompt: 'text overlays',
      personGeneration: 'allow_adult',
      seed: 42,
      numberOfVideos: 1
    });

    expect(httpMocks.createAxios).toHaveBeenNthCalledWith(1, {
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
      headers: { 'x-goog-api-key': 'secret-api-key' }
    });
    expect(httpMocks.apiPost).toHaveBeenCalledWith(
      '/models/veo-3.1-generate-preview:predictLongRunning',
      {
        instances: [
          {
            prompt: 'A cinematic ocean sunrise.',
            image: {
              inlineData: { mimeType: 'image/png', data: 'aW1hZ2U=' }
            },
            lastFrame: {
              inlineData: { mimeType: 'image/jpeg', data: 'ZnJhbWU=' }
            }
          }
        ],
        parameters: {
          negativePrompt: 'text overlays',
          aspectRatio: '16:9',
          durationSeconds: 8,
          personGeneration: 'allow_adult',
          resolution: '1080p',
          seed: 42,
          numberOfVideos: 1
        }
      }
    );
    expect(result.name).toBe('models/veo-3.1-generate-preview/operations/op-123');
  });

  it('gets only a validated Veo operation resource', async () => {
    httpMocks.apiGet.mockResolvedValueOnce({
      data: {
        name: 'models/veo-3.1-fast-generate-preview/operations/op_456',
        done: false
      }
    });
    let client = new Client({ token: 'secret-api-key', apiVersion: 'v1beta' });

    await client.getVideoOperation('models/veo-3.1-fast-generate-preview/operations/op_456');
    expect(httpMocks.apiGet).toHaveBeenCalledWith(
      '/models/veo-3.1-fast-generate-preview/operations/op_456'
    );

    await expect(
      client.getVideoOperation('https://attacker.example/operation')
    ).rejects.toBeInstanceOf(ServiceError);
    expect(httpMocks.apiGet).toHaveBeenCalledTimes(1);
  });

  it('downloads Gemini MP4 bytes with the API key only on the Gemini file request', async () => {
    let bytes = mp4Bytes();
    httpMocks.downloadGet
      .mockResolvedValueOnce({
        status: 302,
        headers: {
          location: 'https://storage.googleapis.com/signed-video-bucket/result.mp4?signature=x'
        }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: bytes,
        headers: { 'content-type': 'video/mp4' }
      });
    let client = new Client({ token: 'secret-api-key', apiVersion: 'v1beta' });

    let result = await client.downloadVeoVideo(
      'https://generativelanguage.googleapis.com/v1beta/files/video_123:download?alt=media'
    );

    expect(httpMocks.downloadGet).toHaveBeenNthCalledWith(
      1,
      'https://generativelanguage.googleapis.com/v1beta/files/video_123:download?alt=media',
      expect.objectContaining({
        headers: { 'x-goog-api-key': 'secret-api-key' },
        maxRedirects: 0,
        responseType: 'arraybuffer'
      })
    );
    expect(httpMocks.downloadGet).toHaveBeenNthCalledWith(
      2,
      'https://storage.googleapis.com/signed-video-bucket/result.mp4?signature=x',
      expect.objectContaining({ headers: undefined, maxRedirects: 0 })
    );
    expect(result).toEqual({ content: bytes, mimeType: 'video/mp4' });
  });

  it('accepts binary/octet-stream video content from Google frontends', async () => {
    let bytes = mp4Bytes();
    httpMocks.downloadGet.mockResolvedValueOnce({
      status: 200,
      data: bytes,
      headers: { 'content-type': 'binary/octet-stream' }
    });
    let client = new Client({ token: 'secret-api-key', apiVersion: 'v1beta' });

    let result = await client.downloadVeoVideo(
      'https://generativelanguage.googleapis.com/v1beta/files/video_bin:download?alt=media'
    );

    expect(result).toEqual({ content: bytes, mimeType: 'video/mp4' });
  });

  it('never reattaches the API key after the initial download request', async () => {
    let bytes = mp4Bytes();
    httpMocks.downloadGet
      .mockResolvedValueOnce({
        status: 302,
        headers: {
          location: 'https://storage.googleapis.com/signed-video-bucket/result.mp4?signature=x'
        }
      })
      .mockResolvedValueOnce({
        status: 302,
        headers: {
          location:
            'https://generativelanguage.googleapis.com/v1beta/files/video_456:download?alt=media'
        }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: bytes,
        headers: { 'content-type': 'video/mp4' }
      });
    let client = new Client({ token: 'secret-api-key', apiVersion: 'v1beta' });

    await client.downloadVeoVideo(
      'https://generativelanguage.googleapis.com/v1beta/files/video_123:download?alt=media'
    );

    expect(httpMocks.downloadGet).toHaveBeenNthCalledWith(
      3,
      'https://generativelanguage.googleapis.com/v1beta/files/video_456:download?alt=media',
      expect.objectContaining({ headers: undefined, maxRedirects: 0 })
    );
  });

  it('rejects malformed redirects and videos above the download limit', async () => {
    let client = new Client({ token: 'secret-api-key', apiVersion: 'v1beta' });
    let videoUri =
      'https://generativelanguage.googleapis.com/v1beta/files/video_123:download?alt=media';

    httpMocks.downloadGet.mockResolvedValueOnce({
      status: 302,
      headers: { location: 'https://%' }
    });
    await expect(client.downloadVeoVideo(videoUri)).rejects.toBeInstanceOf(ServiceError);

    httpMocks.downloadGet.mockResolvedValueOnce({
      status: 200,
      data: mp4Bytes(),
      headers: {
        'content-type': 'video/mp4',
        'content-length': String(512 * 1024 * 1024 + 1)
      }
    });
    await expect(client.downloadVeoVideo(videoUri)).rejects.toBeInstanceOf(ServiceError);
  });

  it('rejects untrusted download URLs and non-MP4 content', async () => {
    let client = new Client({ token: 'secret-api-key', apiVersion: 'v1beta' });

    await expect(
      client.downloadVeoVideo('https://attacker.example/video.mp4')
    ).rejects.toBeInstanceOf(ServiceError);
    expect(httpMocks.downloadGet).not.toHaveBeenCalled();

    httpMocks.downloadGet.mockResolvedValueOnce({
      status: 200,
      data: Buffer.from('not an mp4'),
      headers: { 'content-type': 'video/mp4' }
    });
    await expect(
      client.downloadVeoVideo(
        'https://generativelanguage.googleapis.com/v1beta/files/video_123:download?alt=media'
      )
    ).rejects.toBeInstanceOf(ServiceError);

    httpMocks.downloadGet.mockResolvedValueOnce({
      status: 200,
      data: mp4Bytes(),
      headers: { 'content-type': 'text/plain' }
    });
    await expect(
      client.downloadVeoVideo(
        'https://generativelanguage.googleapis.com/v1beta/files/video_123:download?alt=media'
      )
    ).rejects.toBeInstanceOf(ServiceError);
  });
});
