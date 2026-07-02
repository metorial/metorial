import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  finagoGetDocument,
  finagoGetFileUploadStatus,
  finagoUploadTransactionFile
} from './documents';

let mocks = vi.hoisted(() => ({
  client: {
    get: vi.fn(),
    post: vi.fn(),
    downloadUrl: vi.fn(),
    putBinaryUrl: vi.fn()
  }
}));

vi.mock('../lib/helpers', () => ({
  createClientFromContext: () => mocks.client
}));

describe('finago_upload_transaction_file', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('initiates the documented /fileUpload request and uploads to the presigned URL', async () => {
    let uploadUrl = 'https://attachment.api.24sevenoffice.com/upload/abc123?signature=secret';
    mocks.client.post.mockResolvedValue({
      uploadMethod: 'put',
      uploadUrl,
      fileId: 67890
    });
    mocks.client.putBinaryUrl.mockResolvedValue({ byteLength: 5 });

    let result = await finagoUploadTransactionFile.handleInvocation({
      input: {
        contentType: ' application/pdf ',
        contentBase64: ' SGVsbG8= ',
        fileName: 'receipt.pdf'
      }
    } as any);

    expect(mocks.client.post).toHaveBeenCalledWith(
      '/fileUpload',
      { contentType: 'application/pdf' },
      undefined,
      'initiate file upload'
    );
    expect(mocks.client.putBinaryUrl).toHaveBeenCalledWith({
      url: uploadUrl,
      method: 'PUT',
      contentType: 'application/pdf',
      contentBase64: 'SGVsbG8='
    });
    expect(result.output).toEqual({
      fileId: '67890',
      uploadMethod: 'PUT',
      byteLength: 5,
      fileName: 'receipt.pdf',
      contentType: 'application/pdf',
      record: {
        fileId: '67890',
        uploadMethod: 'PUT'
      }
    });
    expect(JSON.stringify(result.output)).not.toContain('signature=secret');
  });

  it('validates content before creating a Finago upload artifact', async () => {
    await expect(
      finagoUploadTransactionFile.handleInvocation({
        input: {
          contentType: 'application/pdf',
          contentBase64: 'not base64!'
        }
      } as any)
    ).rejects.toThrow(ServiceError);

    await expect(
      finagoUploadTransactionFile.handleInvocation({
        input: {
          contentType: 'applicationpdf',
          contentBase64: 'SGVsbG8='
        }
      } as any)
    ).rejects.toThrow(ServiceError);

    expect(mocks.client.post).not.toHaveBeenCalled();
    expect(mocks.client.putBinaryUrl).not.toHaveBeenCalled();
  });

  it('requires the documented upload response fields before uploading bytes', async () => {
    mocks.client.post.mockResolvedValue({
      uploadUrl: 'https://attachment.api.24sevenoffice.com/upload/abc123',
      fileId: 'file-123'
    });

    await expect(
      finagoUploadTransactionFile.handleInvocation({
        input: {
          contentType: 'application/pdf',
          contentBase64: 'SGVsbG8='
        }
      } as any)
    ).rejects.toThrow('Finago did not return uploadMethod required by /fileUpload.');

    expect(mocks.client.putBinaryUrl).not.toHaveBeenCalled();
  });

  it('rejects invalid presigned upload URLs returned by Finago', async () => {
    mocks.client.post.mockResolvedValue({
      uploadMethod: 'PUT',
      uploadUrl: 'http://attachment.api.24sevenoffice.com/upload/abc123',
      fileId: 'file-123'
    });

    await expect(
      finagoUploadTransactionFile.handleInvocation({
        input: {
          contentType: 'application/pdf',
          contentBase64: 'SGVsbG8='
        }
      } as any)
    ).rejects.toThrow('Finago returned an invalid uploadUrl for /fileUpload.');

    expect(mocks.client.putBinaryUrl).not.toHaveBeenCalled();
  });
});

describe('finago_get_file_upload_status', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('passes the required fileId path parameter and maps the documented response', async () => {
    let record = {
      fileId: 67890,
      status: 'Completed',
      documentId: 12345
    };
    mocks.client.get.mockResolvedValue(record);

    let result = await finagoGetFileUploadStatus.handleInvocation({
      input: { fileId: ' 67890 ' }
    } as any);

    expect(mocks.client.get).toHaveBeenCalledWith(
      '/fileUpload/67890',
      undefined,
      'get file upload status'
    );
    expect(result.output).toEqual({
      fileId: '67890',
      status: 'Completed',
      documentId: 12345,
      record
    });
  });

  it('rejects an empty fileId before calling Finago', async () => {
    await expect(
      finagoGetFileUploadStatus.handleInvocation({
        input: { fileId: '   ' }
      } as any)
    ).rejects.toThrow(ServiceError);

    expect(mocks.client.get).not.toHaveBeenCalled();
  });

  it('rejects a response that omits the documented required status', async () => {
    mocks.client.get.mockResolvedValue({ fileId: 'file-123' });

    await expect(
      finagoGetFileUploadStatus.handleInvocation({
        input: { fileId: 'file-123' }
      } as any)
    ).rejects.toThrow('Finago did not return a file upload status.');
  });
});

describe('finago_get_document', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('passes the documented documentId path parameter and maps document metadata', async () => {
    let record = {
      documentId: 12345,
      contentType: 'application/pdf',
      downloadUrl: 'https://attachment.api.24sevenoffice.com/download/abc123?signature=xyz',
      pages: [
        {
          sequenceNumber: 1,
          thumbnailUrl: 'https://attachment.api.24sevenoffice.com/thumbnail/abc123?page=1',
          previewUrl: 'https://attachment.api.24sevenoffice.com/preview/abc123?page=1'
        }
      ]
    };
    mocks.client.get.mockResolvedValue(record);

    let result = await finagoGetDocument.handleInvocation({
      input: { documentId: 12345 }
    } as any);

    expect(mocks.client.get).toHaveBeenCalledWith(
      '/documents/12345',
      undefined,
      'get document'
    );
    expect(mocks.client.downloadUrl).not.toHaveBeenCalled();
    expect(result.output).toEqual({
      documentId: 12345,
      contentType: 'application/pdf',
      downloadUrl: 'https://attachment.api.24sevenoffice.com/download/abc123?signature=xyz',
      pages: [
        {
          sequenceNumber: 1,
          thumbnailUrl: 'https://attachment.api.24sevenoffice.com/thumbnail/abc123?page=1',
          previewUrl: 'https://attachment.api.24sevenoffice.com/preview/abc123?page=1'
        }
      ],
      byteLength: undefined,
      attachmentCount: 0,
      record
    });
    expect(result.output).not.toHaveProperty('contentBase64');
    expect(result.attachments).toEqual([]);
  });

  it('downloads through the documented downloadUrl and returns file bytes only as an attachment', async () => {
    let record = {
      documentId: 12345,
      contentType: 'application/pdf',
      downloadUrl: 'https://attachment.api.24sevenoffice.com/download/abc123?signature=xyz'
    };
    mocks.client.get.mockResolvedValue(record);
    mocks.client.downloadUrl.mockResolvedValue({
      contentBase64: 'JVBERi0=',
      byteLength: 5,
      contentType: 'application/pdf'
    });

    let result = await finagoGetDocument.handleInvocation({
      input: { documentId: 12345, download: true }
    } as any);

    expect(mocks.client.downloadUrl).toHaveBeenCalledWith(
      record.downloadUrl,
      'application/pdf'
    );
    expect(result.output.byteLength).toBe(5);
    expect(result.output.attachmentCount).toBe(1);
    expect(result.output).not.toHaveProperty('contentBase64');
    expect(result.attachments).toHaveLength(1);
  });

  it('throws ServiceError when download is requested but Finago omits downloadUrl', async () => {
    mocks.client.get.mockResolvedValue({
      documentId: 12345,
      contentType: 'application/pdf'
    });

    await expect(
      finagoGetDocument.handleInvocation({
        input: { documentId: 12345, download: true }
      } as any)
    ).rejects.toBeInstanceOf(ServiceError);

    expect(mocks.client.downloadUrl).not.toHaveBeenCalled();
  });

  it('throws ServiceError when Finago returns malformed page metadata', async () => {
    mocks.client.get.mockResolvedValue({
      documentId: 12345,
      contentType: 'application/pdf',
      downloadUrl: 'https://attachment.api.24sevenoffice.com/download/abc123?signature=xyz',
      pages: [{ sequenceNumber: 1 }]
    });

    await expect(
      finagoGetDocument.handleInvocation({
        input: { documentId: 12345 }
      } as any)
    ).rejects.toBeInstanceOf(ServiceError);

    expect(mocks.client.downloadUrl).not.toHaveBeenCalled();
  });
});
