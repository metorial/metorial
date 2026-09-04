import { Buffer } from 'node:buffer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mocks = vi.hoisted(() => ({
  getAppConfig: vi.fn()
}));

vi.mock('../lib/client', () => ({
  FirebaseManagementClient: class {
    getAppConfig = mocks.getAppConfig;
  }
}));

import { getFirebaseApps } from './get-firebase-apps';

let invokeGetConfig = (platform: 'android' | 'ios' | 'web') =>
  getFirebaseApps.handleInvocation({
    auth: { token: 'access-token' },
    config: { projectId: 'example-project' },
    input: {
      operation: 'get_config',
      platform,
      appId: 'app-1'
    }
  } as any);

beforeEach(() => {
  mocks.getAppConfig.mockReset();
});

describe('get_firebase_apps get_config', () => {
  it('returns native config bytes as a downloadable file without inline base64 output', async () => {
    let configBytes = Buffer.from('{"project_info":{}}', 'utf8');
    let configFileContents = configBytes.toString('base64');
    mocks.getAppConfig.mockResolvedValue({
      platform: 'android',
      projectId: 'example-project',
      appId: 'app-1',
      configFilename: 'google-services.json',
      configFileContents
    });

    let result = await invokeGetConfig('android');

    expect(result.output.config).toEqual({
      platform: 'android',
      projectId: 'example-project',
      appId: 'app-1',
      configFilename: 'google-services.json',
      configMimeType: 'application/json',
      configByteLength: configBytes.byteLength,
      configDownloadAvailable: true
    });
    expect(result.output.config).not.toHaveProperty('configFileContents');
    expect(result.attachments).toEqual([
      {
        mimeType: 'application/json',
        content: {
          type: 'content',
          encoding: 'base64',
          content: configFileContents
        }
      }
    ]);
  });

  it('keeps Web SDK config structured and does not add a file', async () => {
    mocks.getAppConfig.mockResolvedValue({
      platform: 'web',
      projectId: 'example-project',
      appId: 'app-1',
      apiKey: 'web-key',
      authDomain: 'example.firebaseapp.com'
    });

    let result = await invokeGetConfig('web');

    expect(result.output.config).toMatchObject({
      platform: 'web',
      apiKey: 'web-key',
      configDownloadAvailable: false
    });
    expect(result.output.config).not.toHaveProperty('configFileContents');
    expect(result.attachments).toBeUndefined();
  });
});
