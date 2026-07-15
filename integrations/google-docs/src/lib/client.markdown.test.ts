import { beforeEach, describe, expect, it, vi } from 'vitest';

let axiosMocks = vi.hoisted(() => ({
  createAxios: vi.fn(),
  docs: {
    post: vi.fn(),
    get: vi.fn()
  },
  drive: {
    post: vi.fn(),
    get: vi.fn()
  },
  driveUpload: {
    post: vi.fn(),
    patch: vi.fn()
  }
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();

  return {
    ...actual,
    createAxios: axiosMocks.createAxios.mockImplementation((config: { baseURL?: string }) => {
      if (config.baseURL === 'https://docs.googleapis.com/v1') return axiosMocks.docs;
      if (config.baseURL === 'https://www.googleapis.com/drive/v3') {
        return axiosMocks.drive;
      }
      if (config.baseURL === 'https://www.googleapis.com/upload/drive/v3') {
        return axiosMocks.driveUpload;
      }
      throw new Error(`Unexpected base URL: ${config.baseURL}`);
    })
  };
});

import { buildMarkdownMultipartBody, GOOGLE_DOCS_MIME_TYPE, GoogleDocsClient } from './client';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GoogleDocsClient Markdown conversion', () => {
  it('builds the exact Drive multipart body with CRLF separators', () => {
    expect(
      buildMarkdownMultipartBody(
        { name: 'Quarterly plan', mimeType: GOOGLE_DOCS_MIME_TYPE },
        '# Plan\n\n- First',
        'test-boundary'
      )
    ).toBe(
      `--test-boundary\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{"name":"Quarterly plan","mimeType":"${GOOGLE_DOCS_MIME_TYPE}"}\r\n--test-boundary\r\nContent-Type: text/markdown\r\n\r\n# Plan\n\n- First\r\n--test-boundary--`
    );
  });

  it('creates a native Google Docs file through Drive multipart conversion', async () => {
    axiosMocks.driveUpload.post.mockResolvedValueOnce({
      data: {
        id: 'doc-123',
        name: 'Quarterly plan',
        mimeType: GOOGLE_DOCS_MIME_TYPE,
        webViewLink: 'https://docs.google.com/document/d/doc-123/edit'
      }
    });

    let client = new GoogleDocsClient({ token: 'test-token' });
    let result = await client.createDocumentFromMarkdown(
      'Quarterly plan',
      '# Plan\n\n- First'
    );

    let [path, body, options] = axiosMocks.driveUpload.post.mock.calls[0]!;
    let contentType = options.headers['Content-Type'] as string;
    let boundary = contentType.replace('multipart/related; boundary=', '');

    expect(path).toBe('files');
    expect(axiosMocks.createAxios).toHaveBeenCalledWith({
      baseURL: 'https://www.googleapis.com/upload/drive/v3',
      headers: {
        Authorization: 'Bearer test-token'
      }
    });
    expect(body).toBe(
      buildMarkdownMultipartBody(
        { name: 'Quarterly plan', mimeType: GOOGLE_DOCS_MIME_TYPE },
        '# Plan\n\n- First',
        boundary
      )
    );
    expect(options).toEqual({
      params: {
        uploadType: 'multipart',
        fields: 'id,name,mimeType,modifiedTime,createdTime,webViewLink',
        supportsAllDrives: true
      },
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`
      }
    });
    expect(result).toMatchObject({
      id: 'doc-123',
      mimeType: GOOGLE_DOCS_MIME_TYPE
    });
  });

  it('patches a native document with Markdown to replace its full body', async () => {
    axiosMocks.driveUpload.patch.mockResolvedValueOnce({
      data: {
        id: 'folder/doc-123',
        name: 'Quarterly plan',
        mimeType: GOOGLE_DOCS_MIME_TYPE
      }
    });

    let client = new GoogleDocsClient({ token: 'test-token' });
    await client.updateDocumentFromMarkdown('folder/doc-123', '# Replacement');

    let [path, body, options] = axiosMocks.driveUpload.patch.mock.calls[0]!;
    let contentType = options.headers['Content-Type'] as string;
    let boundary = contentType.replace('multipart/related; boundary=', '');

    expect(path).toBe('files/folder%2Fdoc-123');
    expect(body).toBe(
      buildMarkdownMultipartBody(
        { mimeType: GOOGLE_DOCS_MIME_TYPE },
        '# Replacement',
        boundary
      )
    );
    expect(options.params).toEqual({
      uploadType: 'multipart',
      fields: 'id,name,mimeType,modifiedTime,createdTime,webViewLink',
      supportsAllDrives: true
    });
  });

  it('maps Drive upload failures to user-facing service errors', async () => {
    axiosMocks.driveUpload.post.mockRejectedValueOnce({
      response: {
        status: 403,
        data: {
          error: {
            message: 'Insufficient Permission'
          }
        }
      }
    });

    let client = new GoogleDocsClient({ token: 'test-token' });

    await expect(
      client.createDocumentFromMarkdown('Quarterly plan', '# Plan')
    ).rejects.toMatchObject({
      data: {
        reason: 'google_docs_markdown_create_failed',
        upstreamStatus: 403
      }
    });
  });
});
