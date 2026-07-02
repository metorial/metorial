import { afterEach, describe, expect, it, vi } from 'vitest';

let post = vi.fn();
let get = vi.fn();
let patch = vi.fn();
let deleteRequest = vi.fn();

let loadClientModule = async () => {
  vi.resetModules();
  post.mockReset();
  get.mockReset();
  patch.mockReset();
  deleteRequest.mockReset();

  vi.doMock('slates', async () => {
    let actual = await vi.importActual<typeof import('slates')>('slates');

    return {
      ...actual,
      createAxios: vi.fn(() => ({
        post,
        get,
        patch,
        delete: deleteRequest
      }))
    };
  });

  return await import('./lib/client');
};

afterEach(() => {
  vi.doUnmock('slates');
  vi.resetModules();
});

describe('google-cloud-speech client', () => {
  it('retries recognizer requests in global when the configured location is rejected', async () => {
    post
      .mockRejectedValueOnce(
        new Error(
          'Expected resource location to be global, but found us-east1 in resource name.'
        )
      )
      .mockResolvedValueOnce({
        data: {
          name: 'projects/test-project/locations/global/operations/op-1',
          done: false
        }
      });

    let { SpeechToTextClient } = await loadClientModule();
    let client = new SpeechToTextClient({
      token: 'token',
      projectId: 'test-project',
      region: 'us-east1'
    });

    let result = await client.createRecognizer({
      recognizerId: 'demo-recognizer',
      displayName: 'Demo Recognizer',
      model: 'latest_long',
      languageCodes: ['en-US'],
      enableAutomaticPunctuation: true
    });

    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0]?.[0]).toContain(
      '/v2/projects/test-project/locations/us-east1/recognizers'
    );
    expect(post.mock.calls[1]?.[0]).toContain(
      '/v2/projects/test-project/locations/global/recognizers'
    );
    expect(result.name).toBe('projects/test-project/locations/global/operations/op-1');
  });
});
