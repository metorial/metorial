import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnimicroClient } from '../lib/client';
import { downloadFile } from './read';

let baseContext = {
  auth: {
    token: 'access-token',
    environment: 'test'
  },
  config: {
    environment: 'test',
    defaultTop: 50
  }
};

describe('download_file', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns downloaded file bytes only as a Slate attachment', async () => {
    vi.spyOn(UnimicroClient.prototype, 'downloadFile').mockResolvedValue({
      contentBase64: 'SGVsbG8=',
      byteLength: 5,
      attachmentByteLength: 5,
      mimeType: 'text/plain',
      fileName: 'hello.txt',
      storageReference: 'storage-reference',
      file: {
        ID: 123,
        Name: 'hello.txt',
        StorageReference: 'storage-reference'
      }
    });

    let result = await downloadFile.handleInvocation({
      ...baseContext,
      input: {
        companyKey: 'company-key',
        fileId: 123
      }
    } as any);

    expect(UnimicroClient.prototype.downloadFile).toHaveBeenCalledWith({
      fileId: 123,
      storageReference: undefined,
      fileName: undefined,
      mimeType: undefined
    });
    expect(result.output).toEqual({
      fileId: 123,
      storageReference: 'storage-reference',
      fileName: 'hello.txt',
      mimeType: 'text/plain',
      byteLength: 5,
      attachmentCount: 1,
      file: {
        ID: 123,
        Name: 'hello.txt',
        StorageReference: 'storage-reference'
      }
    });
    expect(result.output).not.toHaveProperty('contentBase64');
    expect(result.output).not.toHaveProperty('fileContent');
    expect(result.attachments).toEqual([
      {
        mimeType: 'text/plain',
        content: {
          type: 'content',
          encoding: 'base64',
          content: 'SGVsbG8='
        }
      }
    ]);
  });

  it('throws ServiceError when neither fileId nor storageReference is provided', async () => {
    await expect(
      downloadFile.handleInvocation({
        ...baseContext,
        input: {
          companyKey: 'company-key'
        }
      } as any)
    ).rejects.toBeInstanceOf(ServiceError);
  });
});
