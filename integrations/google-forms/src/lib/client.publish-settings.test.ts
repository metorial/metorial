import { beforeEach, describe, expect, it, vi } from 'vitest';

let axiosMocks = vi.hoisted(() => ({
  createAxios: vi.fn(),
  post: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();

  return {
    ...actual,
    createAxios: axiosMocks.createAxios.mockImplementation(() => ({
      post: axiosMocks.post
    }))
  };
});

import { GoogleFormsClient } from './client';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GoogleFormsClient setPublishSettings', () => {
  it('posts the complete publish state with the narrow publishState field mask', async () => {
    axiosMocks.post.mockResolvedValueOnce({
      data: {
        formId: 'form-123',
        publishSettings: {
          publishState: {
            isPublished: true,
            isAcceptingResponses: false
          }
        }
      }
    });

    let client = new GoogleFormsClient('oauth-token');
    let result = await client.setPublishSettings('form-123', {
      isPublished: true,
      isAcceptingResponses: false
    });

    expect(axiosMocks.createAxios).toHaveBeenCalledWith({
      baseURL: 'https://forms.googleapis.com/v1',
      headers: {
        Authorization: 'Bearer oauth-token',
        'Content-Type': 'application/json'
      }
    });
    expect(axiosMocks.post).toHaveBeenCalledWith('/forms/form-123:setPublishSettings', {
      publishSettings: {
        publishState: {
          isPublished: true,
          isAcceptingResponses: false
        }
      },
      updateMask: 'publishState'
    });
    expect(result.publishSettings?.publishState).toEqual({
      isPublished: true,
      isAcceptingResponses: false
    });
  });

  it('propagates Google API failures unwrapped so the tool layer maps them once', async () => {
    let upstreamError = {
      response: {
        status: 400,
        statusText: 'Bad Request',
        data: { error: { message: 'Legacy forms are not supported.' } }
      }
    };
    axiosMocks.post.mockRejectedValueOnce(upstreamError);

    let client = new GoogleFormsClient('oauth-token');

    await expect(
      client.setPublishSettings('legacy-form', {
        isPublished: true,
        isAcceptingResponses: true
      })
    ).rejects.toBe(upstreamError);
  });
});
