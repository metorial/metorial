import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMocks = vi.hoisted(() => ({
  setPublishSettings: vi.fn()
}));

vi.mock('./lib/client', () => ({
  GoogleFormsClient: class {
    setPublishSettings(...args: unknown[]) {
      return clientMocks.setPublishSettings(...args);
    }
  }
}));

import { provider } from './index';

let createGoogleFormsToolTestClient = () =>
  createLocalSlateTestClient({
    slate: provider as any,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'test-token' }
      }
    }
  });

describe('Google Forms set_publish_settings behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates and returns the publish state reported by Google', async () => {
    clientMocks.setPublishSettings.mockResolvedValue({
      formId: 'form-123',
      publishSettings: {
        publishState: {
          isPublished: true,
          isAcceptingResponses: false
        }
      }
    });
    let client = createGoogleFormsToolTestClient();

    let result = await client.invokeTool('set_publish_settings', {
      formId: 'form-123',
      isPublished: true,
      isAcceptingResponses: false
    });

    expect(clientMocks.setPublishSettings).toHaveBeenCalledWith('form-123', {
      isPublished: true,
      isAcceptingResponses: false
    });
    expect(result.output).toEqual({
      formId: 'form-123',
      isPublished: true,
      isAcceptingResponses: false
    });
  });

  it('rejects accepting responses on an unpublished form before calling Google', async () => {
    let client = createGoogleFormsToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('set_publish_settings', {
          formId: 'form-123',
          isPublished: false,
          isAcceptingResponses: true
        }),
      'A Google Form cannot accept responses while unpublished. Set isAcceptingResponses to false or publish the form.'
    );
    expect(clientMocks.setPublishSettings).not.toHaveBeenCalled();
  });

  it('maps unexpected client failures to a Google Forms service error', async () => {
    clientMocks.setPublishSettings.mockRejectedValue(new Error('request failed'));
    let client = createGoogleFormsToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('set_publish_settings', {
          formId: 'form-123',
          isPublished: false,
          isAcceptingResponses: false
        }),
      'Google Forms API set publish settings failed: request failed'
    );
  });
});
