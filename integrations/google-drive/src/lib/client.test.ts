import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let axiosMocks = vi.hoisted(() => ({
  api: {
    get: vi.fn()
  },
  uploadApi: {
    post: vi.fn()
  },
  createAxios: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();

  return {
    ...actual,
    createAxios: axiosMocks.createAxios
  };
});

import {
  GOOGLE_DRIVE_DEFAULT_PAGE_SIZE,
  GOOGLE_DRIVE_MAX_PAGE_SIZE,
  GoogleDriveClient,
  MAX_DRIVE_DOWNLOAD_BYTES,
  normalizeGoogleDrivePageSize,
  normalizeGoogleDrivePageToken
} from './client';

beforeEach(() => {
  axiosMocks.api.get.mockReset();
  axiosMocks.uploadApi.post.mockReset();
  axiosMocks.createAxios.mockReset();
  axiosMocks.createAxios
    .mockReturnValueOnce(axiosMocks.api)
    .mockReturnValueOnce(axiosMocks.uploadApi);
});

describe('GoogleDriveClient pagination validation', () => {
  it('normalizes page tokens before calling Drive', async () => {
    axiosMocks.api.get.mockResolvedValue({
      data: {
        files: [],
        nextPageToken: 'next-token'
      }
    });

    let client = new GoogleDriveClient('token');
    await client.listFiles({
      pageSize: 25,
      pageToken: ' next-token '
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith('/files', {
      params: expect.objectContaining({
        pageSize: 25,
        pageToken: 'next-token'
      })
    });
  });

  it('omits blank page tokens and rejects known non-token placeholders', () => {
    expect(normalizeGoogleDrivePageToken(undefined)).toBeUndefined();
    expect(normalizeGoogleDrivePageToken('   ')).toBeUndefined();
    expect(normalizeGoogleDrivePageToken(' token ')).toBe('token');

    expect(() => normalizeGoogleDrivePageToken('(no output)')).toThrow(ServiceError);
    expect(() => normalizeGoogleDrivePageToken('undefined')).toThrow(ServiceError);
    expect(() => normalizeGoogleDrivePageToken('null')).toThrow(ServiceError);
  });

  it('rejects page sizes outside the Drive files.list range', () => {
    expect(normalizeGoogleDrivePageSize(undefined)).toBe(GOOGLE_DRIVE_DEFAULT_PAGE_SIZE);
    expect(normalizeGoogleDrivePageSize(1)).toBe(1);
    expect(normalizeGoogleDrivePageSize(GOOGLE_DRIVE_MAX_PAGE_SIZE)).toBe(
      GOOGLE_DRIVE_MAX_PAGE_SIZE
    );

    expect(() => normalizeGoogleDrivePageSize(0)).toThrow(ServiceError);
    expect(() => normalizeGoogleDrivePageSize(GOOGLE_DRIVE_MAX_PAGE_SIZE + 1)).toThrow(
      ServiceError
    );
    expect(() => normalizeGoogleDrivePageSize(1.5)).toThrow(ServiceError);
  });

  it('turns Drive 400s for pageToken requests into actionable ServiceErrors', async () => {
    axiosMocks.api.get.mockRejectedValue({
      response: {
        status: 400,
        data: {
          error: {
            message: 'Invalid page token'
          }
        }
      }
    });

    let client = new GoogleDriveClient('token');

    await expect(
      client.listFiles({
        pageToken: 'stale-token'
      })
    ).rejects.toMatchObject({
      data: {
        reason: 'invalid_page_token',
        upstreamStatus: 400
      }
    });
  });
});

describe('GoogleDriveClient download guards', () => {
  it('rejects Google Workspace downloads with a ServiceError', async () => {
    axiosMocks.api.get.mockResolvedValue({
      data: {
        mimeType: 'application/vnd.google-apps.document',
        name: 'Native Doc'
      }
    });

    let client = new GoogleDriveClient('token');

    await expect(client.downloadFile('doc-id')).rejects.toMatchObject({
      data: {
        reason: 'google_workspace_download_requires_export'
      }
    });
    expect(axiosMocks.api.get).toHaveBeenCalledTimes(1);
  });

  it('rejects files larger than the MCP-safe download limit with a ServiceError', async () => {
    axiosMocks.api.get.mockResolvedValue({
      data: {
        mimeType: 'text/plain',
        size: String(MAX_DRIVE_DOWNLOAD_BYTES + 1)
      }
    });

    let client = new GoogleDriveClient('token');

    await expect(client.downloadFile('large-file-id')).rejects.toMatchObject({
      data: {
        reason: 'drive_download_too_large'
      }
    });
    expect(axiosMocks.api.get).toHaveBeenCalledTimes(1);
  });

  it('returns ServiceError for missing files discovered during metadata lookup', async () => {
    axiosMocks.api.get.mockRejectedValue({
      response: {
        status: 404
      }
    });

    let client = new GoogleDriveClient('token');

    await expect(client.downloadFile('missing-file-id')).rejects.toMatchObject({
      data: {
        reason: 'drive_file_not_found',
        upstreamStatus: 404
      }
    });
  });
});
