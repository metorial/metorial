import { createLocalSlateTestClient } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const clientMocks = vi.hoisted(() => ({
  generateVeoVideo: vi.fn(),
  getVideoOperation: vi.fn(),
  downloadVeoVideo: vi.fn()
}));

const sleepMock = vi.hoisted(() => vi.fn(async (_milliseconds: number) => {}));

vi.mock('./lib/helpers', () => ({
  createClient: () => clientMocks,
  sleep: sleepMock
}));

import { provider } from './index';

let createToolTestClient = (apiVersion: 'v1beta' | 'v1' = 'v1beta') =>
  createLocalSlateTestClient({
    slate: provider as any,
    state: {
      config: { apiVersion },
      auth: {
        authenticationMethodId: 'api_key',
        output: { token: 'test-api-key' }
      }
    }
  });

let mp4Bytes = () =>
  Buffer.concat([
    Buffer.from([0, 0, 0, 24]),
    Buffer.from('ftyp', 'ascii'),
    Buffer.from('isom0000', 'ascii')
  ]);

describe('Gemini Veo tool behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts a supported Veo request and returns its operation name', async () => {
    clientMocks.generateVeoVideo.mockResolvedValue({
      name: 'models/veo-3.1-generate-preview/operations/op-123'
    });
    let client = createToolTestClient();

    let result = await client.invokeTool('generate_video', {
      model: 'veo-3.1-generate-preview',
      prompt: 'A slow cinematic pan across a mountain lake at sunrise.',
      imageBase64: 'aW1h\nZ2U=',
      imageMimeType: 'image/png',
      aspectRatio: '16:9',
      durationSeconds: 8,
      resolution: '1080p',
      numberOfVideos: 1
    });

    expect(clientMocks.generateVeoVideo).toHaveBeenCalledWith('veo-3.1-generate-preview', {
      prompt: 'A slow cinematic pan across a mountain lake at sunrise.',
      image: { mimeType: 'image/png', data: 'aW1hZ2U=' },
      lastFrame: undefined,
      negativePrompt: undefined,
      aspectRatio: '16:9',
      durationSeconds: 8,
      resolution: '1080p',
      personGeneration: undefined,
      seed: undefined,
      numberOfVideos: 1
    });
    expect(result.output).toEqual({
      operationName: 'models/veo-3.1-generate-preview/operations/op-123',
      done: false
    });
    expect(result.attachments).toBeUndefined();
    expect(clientMocks.getVideoOperation).not.toHaveBeenCalled();
    expect(sleepMock).not.toHaveBeenCalled();
  });

  it('accepts a 7 second duration for Veo 2 and rejects it for Veo 3 models', async () => {
    clientMocks.generateVeoVideo.mockResolvedValue({
      name: 'models/veo-2.0-generate-001/operations/op-veo2'
    });
    let client = createToolTestClient();

    let result = await client.invokeTool('generate_video', {
      model: 'veo-2.0-generate-001',
      prompt: 'A calm forest stream in the morning.',
      durationSeconds: 7
    });

    expect(clientMocks.generateVeoVideo).toHaveBeenCalledWith(
      'veo-2.0-generate-001',
      expect.objectContaining({ durationSeconds: 7 })
    );
    expect(result.output).toEqual({
      operationName: 'models/veo-2.0-generate-001/operations/op-veo2',
      done: false
    });

    clientMocks.generateVeoVideo.mockClear();
    await expect(
      client.invokeTool('generate_video', {
        model: 'veo-3.1-generate-preview',
        prompt: 'A calm forest stream in the morning.',
        durationSeconds: 7
      })
    ).rejects.toThrow('Veo 3 and later models support 4, 6, or 8 second videos');
    expect(clientMocks.generateVeoVideo).not.toHaveBeenCalled();
  });

  it('rejects a 4 second duration for Veo 2 with the supported value list', async () => {
    await expect(
      createToolTestClient().invokeTool('generate_video', {
        model: 'veo-2.0-generate-001',
        prompt: 'A calm forest stream in the morning.',
        durationSeconds: 4
      })
    ).rejects.toThrow('Veo 2 supports durationSeconds values 5, 6, 7, or 8');
    expect(clientMocks.generateVeoVideo).not.toHaveBeenCalled();
  });

  it('polls during the bounded wait and reports completion within the window', async () => {
    clientMocks.generateVeoVideo.mockResolvedValue({
      name: 'models/veo-3.1-generate-preview/operations/op-wait'
    });
    clientMocks.getVideoOperation
      .mockResolvedValueOnce({
        name: 'models/veo-3.1-generate-preview/operations/op-wait',
        done: false
      })
      .mockResolvedValueOnce({
        name: 'models/veo-3.1-generate-preview/operations/op-wait',
        done: true
      });
    let client = createToolTestClient();

    let result = await client.invokeTool('generate_video', {
      model: 'veo-3.1-generate-preview',
      prompt: 'A slow cinematic pan across a mountain lake at sunrise.',
      waitSeconds: 20
    });

    expect(sleepMock).toHaveBeenCalledTimes(2);
    expect(sleepMock).toHaveBeenCalledWith(5_000);
    expect(clientMocks.getVideoOperation).toHaveBeenCalledTimes(2);
    expect(clientMocks.getVideoOperation).toHaveBeenCalledWith(
      'models/veo-3.1-generate-preview/operations/op-wait'
    );
    expect(result.output).toEqual({
      operationName: 'models/veo-3.1-generate-preview/operations/op-wait',
      done: true
    });
    expect(result.message).toContain('completed within the 20s wait');
    expect(result.message).toContain('get_video_operation');
    expect(result.attachments).toBeUndefined();
  });

  it('stops polling at the wait bound and reports the operation as still running', async () => {
    clientMocks.generateVeoVideo.mockResolvedValue({
      name: 'models/veo-3.1-generate-preview/operations/op-slow'
    });
    clientMocks.getVideoOperation.mockResolvedValue({
      name: 'models/veo-3.1-generate-preview/operations/op-slow',
      done: false
    });
    let client = createToolTestClient();

    let result = await client.invokeTool('generate_video', {
      model: 'veo-3.1-generate-preview',
      prompt: 'A slow cinematic pan across a mountain lake at sunrise.',
      waitSeconds: 10
    });

    expect(sleepMock).toHaveBeenCalledTimes(2);
    expect(clientMocks.getVideoOperation).toHaveBeenCalledTimes(2);
    expect(result.output).toEqual({
      operationName: 'models/veo-3.1-generate-preview/operations/op-slow',
      done: false
    });
    expect(result.message).toContain('still running after waiting 10s');
    expect(result.message).toContain('get_video_operation');
  });

  it('surfaces a terminal Veo failure observed during the bounded wait as ServiceError', async () => {
    clientMocks.generateVeoVideo.mockResolvedValue({
      name: 'models/veo-3.1-generate-preview/operations/op-wait-failed'
    });
    clientMocks.getVideoOperation.mockResolvedValue({
      name: 'models/veo-3.1-generate-preview/operations/op-wait-failed',
      done: true,
      error: {
        code: 9,
        status: 'FAILED_PRECONDITION',
        message: 'Video generation was blocked.'
      }
    });

    await expect(
      createToolTestClient().invokeTool('generate_video', {
        model: 'veo-3.1-generate-preview',
        prompt: 'A slow cinematic pan across a mountain lake at sunrise.',
        waitSeconds: 5
      })
    ).rejects.toThrow('Video generation was blocked');
    expect(clientMocks.getVideoOperation).toHaveBeenCalledTimes(1);
  });

  it('does not poll when waitSeconds is 0', async () => {
    clientMocks.generateVeoVideo.mockResolvedValue({
      name: 'models/veo-3.1-generate-preview/operations/op-nowait'
    });
    let client = createToolTestClient();

    let result = await client.invokeTool('generate_video', {
      model: 'veo-3.1-generate-preview',
      prompt: 'A slow cinematic pan across a mountain lake at sunrise.',
      waitSeconds: 0
    });

    expect(clientMocks.getVideoOperation).not.toHaveBeenCalled();
    expect(sleepMock).not.toHaveBeenCalled();
    expect(result.output).toEqual({
      operationName: 'models/veo-3.1-generate-preview/operations/op-nowait',
      done: false
    });
  });

  it('rejects unsupported API versions and incompatible Veo controls with ServiceError', async () => {
    await expect(
      createToolTestClient('v1').invokeTool('generate_video', {
        model: 'veo-3.1-generate-preview',
        prompt: 'A short video.'
      })
    ).rejects.toThrow('Veo video generation is available through Gemini Developer API v1beta');

    await expect(
      createToolTestClient().invokeTool('generate_video', {
        model: 'veo-3.1-lite-generate-preview',
        prompt: 'A short video.',
        resolution: '4k'
      })
    ).rejects.toThrow('Veo Lite models do not support 4k output');

    await expect(
      createToolTestClient().invokeTool('generate_video', {
        model: 'veo-3.1-generate-preview',
        prompt: 'A short interpolation.',
        lastFrameBase64: 'ZnJhbWU=',
        lastFrameMimeType: 'image/jpeg'
      })
    ).rejects.toThrow(
      'imageBase64 and imageMimeType are required when a last frame is provided'
    );

    await expect(
      createToolTestClient().invokeTool('generate_video', {
        model: 'veo-3.0-generate-001',
        prompt: 'A portrait short video.',
        aspectRatio: '9:16',
        durationSeconds: 8,
        resolution: '1080p'
      })
    ).rejects.toThrow('Veo 3.0 supports 1080p output only at 16:9');

    expect(clientMocks.generateVeoVideo).not.toHaveBeenCalled();
  });

  it('returns pending operation metadata without attachments', async () => {
    clientMocks.getVideoOperation.mockResolvedValue({
      name: 'models/veo-3.1-fast-generate-preview/operations/op-456',
      done: false
    });
    let client = createToolTestClient();

    let result = await client.invokeTool('get_video_operation', {
      operationName: 'models/veo-3.1-fast-generate-preview/operations/op-456'
    });

    expect(result.output).toEqual({
      operationName: 'models/veo-3.1-fast-generate-preview/operations/op-456',
      done: false,
      videos: [],
      attachmentCount: 0
    });
    expect(result.attachments).toBeUndefined();
    expect(clientMocks.downloadVeoVideo).not.toHaveBeenCalled();
  });

  it('downloads completed Veo output only through a Slate attachment', async () => {
    let bytes = mp4Bytes();
    let videoUri =
      'https://generativelanguage.googleapis.com/v1beta/files/video_789:download?alt=media';
    clientMocks.getVideoOperation.mockResolvedValue({
      name: 'models/veo-3.1-generate-preview/operations/op-789',
      done: true,
      response: {
        generateVideoResponse: {
          generatedSamples: [{ video: { uri: videoUri } }]
        }
      }
    });
    clientMocks.downloadVeoVideo.mockResolvedValue({
      content: bytes,
      mimeType: 'video/mp4'
    });
    let client = createToolTestClient();

    let result = await client.invokeTool('get_video_operation', {
      operationName: 'models/veo-3.1-generate-preview/operations/op-789'
    });

    expect(clientMocks.downloadVeoVideo).toHaveBeenCalledWith(videoUri);
    expect(result.output).toEqual({
      operationName: 'models/veo-3.1-generate-preview/operations/op-789',
      done: true,
      videos: [
        {
          attachmentIndex: 0,
          fileName: 'op-789-1.mp4',
          mimeType: 'video/mp4',
          sizeBytes: bytes.length
        }
      ],
      attachmentCount: 1
    });
    expect(result.attachments).toEqual([
      {
        mimeType: 'video/mp4',
        content: {
          type: 'content',
          encoding: 'base64',
          content: bytes.toString('base64')
        }
      }
    ]);
    expect(JSON.stringify(result.output)).not.toContain(videoUri);
    expect(JSON.stringify(result.output)).not.toContain(bytes.toString('base64'));
  });

  it('surfaces a terminal Veo operation failure as ServiceError', async () => {
    clientMocks.getVideoOperation.mockResolvedValue({
      name: 'models/veo-3.1-generate-preview/operations/op-failed',
      done: true,
      error: {
        code: 9,
        status: 'FAILED_PRECONDITION',
        message: 'Video generation was blocked.'
      }
    });

    await expect(
      createToolTestClient().invokeTool('get_video_operation', {
        operationName: 'models/veo-3.1-generate-preview/operations/op-failed'
      })
    ).rejects.toThrow('Video generation was blocked');
    expect(clientMocks.downloadVeoVideo).not.toHaveBeenCalled();
  });
});
