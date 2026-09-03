import { Buffer } from 'node:buffer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mocks = vi.hoisted(() => ({
  getObjectMetadata: vi.fn(),
  downloadObject: vi.fn()
}));

vi.mock('../lib/client', () => ({
  Client: class {
    getObjectMetadata = mocks.getObjectMetadata;
    downloadObject = mocks.downloadObject;
  }
}));

import { getObject } from './get-object';

beforeEach(() => {
  mocks.getObjectMetadata.mockReset();
  mocks.downloadObject.mockReset();
});

describe('get_object binary downloads', () => {
  it('returns exact object bytes as a base64 file with provider metadata', async () => {
    let content = Buffer.from([0, 255, 1, 128, 10]);
    mocks.getObjectMetadata.mockResolvedValue({
      name: 'images/sample.png',
      bucket: 'bucket-name',
      size: String(content.byteLength),
      contentType: 'image/png',
      storageClass: 'STANDARD'
    });
    mocks.downloadObject.mockResolvedValue(content);

    let result = await getObject.handleInvocation({
      auth: { token: 'access-token' },
      config: { projectId: 'example-project' },
      input: {
        bucketName: 'bucket-name',
        objectName: 'images/sample.png',
        includeContent: true
      }
    } as any);

    expect(result.output).toMatchObject({
      objectName: 'images/sample.png',
      bucketName: 'bucket-name',
      sizeBytes: String(content.byteLength),
      contentType: 'image/png'
    });
    expect(result.attachments).toEqual([
      {
        mimeType: 'image/png',
        content: {
          type: 'content',
          encoding: 'base64',
          content: content.toString('base64')
        }
      }
    ]);
  });
});
