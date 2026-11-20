import { Buffer } from 'node:buffer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mocks = vi.hoisted(() => ({
  getObjectMetadata: vi.fn()
}));

vi.mock('../lib/client', () => ({
  Client: class {
    getObjectMetadata = mocks.getObjectMetadata;
  }
}));

import { getObject } from './get-object';

beforeEach(() => {
  mocks.getObjectMetadata.mockReset();
});

describe('get_object binary downloads', () => {
  it('prepares a generation-pinned provider download with metadata', async () => {
    let content = Buffer.from([0, 255, 1, 128, 10]);
    mocks.getObjectMetadata.mockResolvedValue({
      name: 'images/sample.png',
      bucket: 'bucket-name',
      size: String(content.byteLength),
      contentType: 'image/png',
      storageClass: 'STANDARD',
      generation: '1234567890123456789'
    });

    const addAttachment = vi.fn();
    let result = await getObject.handleInvocation({
      addAttachment,
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
    expect(addAttachment).toHaveBeenCalledWith({
      type: 'url',
      url: 'https://storage.googleapis.com/storage/v1/b/bucket-name/o/images%2Fsample.png',
      mimeType: 'image/png',
      query: { alt: 'media', generation: '1234567890123456789' },
      headers: { Authorization: 'Bearer access-token' }
    });
  });
});
