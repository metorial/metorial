import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let axiosMocks = vi.hoisted(() => ({
  api: {
    get: vi.fn(),
    patch: vi.fn()
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
  GOOGLE_DRIVE_CHANGES_MAX_PAGE_SIZE,
  GOOGLE_DRIVE_DEFAULT_PAGE_SIZE,
  GOOGLE_DRIVE_MAX_PAGE_SIZE,
  GoogleDriveClient,
  MAX_DRIVE_DOWNLOAD_BYTES,
  normalizeGoogleDriveChangesPageSize,
  normalizeGoogleDrivePageSize,
  normalizeGoogleDrivePageToken
} from './client';

beforeEach(() => {
  axiosMocks.api.get.mockReset();
  axiosMocks.api.patch.mockReset();
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

  it('validates and forwards Drive changes pagination using current v3 fields', async () => {
    axiosMocks.api.get.mockResolvedValue({
      data: {
        changes: [
          {
            changeType: 'file',
            time: '2026-07-14T09:00:00Z',
            fileId: 'file-1',
            removed: false
          }
        ],
        newStartPageToken: 'new-start-token'
      }
    });

    let client = new GoogleDriveClient('token');
    let result = await client.listChanges(' start-token ', {
      pageSize: 250,
      driveId: 'drive-1',
      includeRemoved: true,
      spaces: 'drive'
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith('/changes', {
      params: expect.objectContaining({
        pageToken: 'start-token',
        pageSize: 250,
        driveId: 'drive-1',
        includeRemoved: true,
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: expect.stringContaining('changes(changeType,time,removed,fileId')
      })
    });
    expect(result).toEqual({
      changes: [
        {
          changeId: '',
          changeType: 'file',
          type: 'file',
          time: '2026-07-14T09:00:00Z',
          removed: false,
          fileId: 'file-1',
          file: undefined,
          driveId: undefined,
          drive: undefined
        }
      ],
      nextPageToken: undefined,
      newStartPageToken: 'new-start-token'
    });
  });

  it('rejects invalid Drive changes page sizes with ServiceError', () => {
    expect(normalizeGoogleDriveChangesPageSize(undefined)).toBe(
      GOOGLE_DRIVE_DEFAULT_PAGE_SIZE
    );
    expect(normalizeGoogleDriveChangesPageSize(GOOGLE_DRIVE_CHANGES_MAX_PAGE_SIZE)).toBe(
      GOOGLE_DRIVE_CHANGES_MAX_PAGE_SIZE
    );
    expect(() =>
      normalizeGoogleDriveChangesPageSize(GOOGLE_DRIVE_CHANGES_MAX_PAGE_SIZE + 1)
    ).toThrow(ServiceError);
    expect(() => normalizeGoogleDriveChangesPageSize(1.5)).toThrow(ServiceError);
  });

  it('gets a shared-drive start token with shared-drive support enabled', async () => {
    axiosMocks.api.get.mockResolvedValue({
      data: {
        startPageToken: 'start-token'
      }
    });

    let client = new GoogleDriveClient('token');
    await expect(client.getStartPageToken('drive-1')).resolves.toBe('start-token');

    expect(axiosMocks.api.get).toHaveBeenCalledWith('/changes/startPageToken', {
      params: {
        supportsAllDrives: true,
        driveId: 'drive-1'
      }
    });
  });
});

describe('GoogleDriveClient comment updates', () => {
  it('updates only parent comment content and requests the returned tool fields', async () => {
    axiosMocks.api.patch.mockResolvedValue({
      data: {
        id: 'comment-1',
        content: 'Updated comment',
        createdTime: '2026-07-14T08:00:00Z',
        modifiedTime: '2026-07-14T09:00:00Z',
        author: { displayName: 'Example User' },
        resolved: false
      }
    });

    let client = new GoogleDriveClient('token');
    let comment = await client.updateComment(
      'file/with/slash',
      'comment/with/slash',
      'Updated comment'
    );

    expect(axiosMocks.api.patch).toHaveBeenCalledWith(
      '/files/file%2Fwith%2Fslash/comments/comment%2Fwith%2Fslash',
      { content: 'Updated comment' },
      {
        params: {
          fields:
            'id,content,createdTime,modifiedTime,author,resolved,replies,quotedFileContent,anchor'
        }
      }
    );
    expect(comment).toMatchObject({
      commentId: 'comment-1',
      content: 'Updated comment'
    });
  });

  it('updates reply content through the Drive replies endpoint', async () => {
    axiosMocks.api.patch.mockResolvedValue({
      data: {
        id: 'reply-1',
        content: 'Updated reply',
        createdTime: '2026-07-14T08:00:00Z',
        modifiedTime: '2026-07-14T09:00:00Z',
        author: { displayName: 'Example User' }
      }
    });

    let client = new GoogleDriveClient('token');
    let reply = await client.updateReply(
      'file/with/slash',
      'comment/with/slash',
      'reply/with/slash',
      'Updated reply'
    );

    expect(axiosMocks.api.patch).toHaveBeenCalledWith(
      '/files/file%2Fwith%2Fslash/comments/comment%2Fwith%2Fslash/replies/reply%2Fwith%2Fslash',
      { content: 'Updated reply' },
      { params: { fields: 'id,content,createdTime,modifiedTime,author,action' } }
    );
    expect(reply).toMatchObject({
      replyId: 'reply-1',
      content: 'Updated reply'
    });
  });
});

describe('GoogleDriveClient about information', () => {
  it('requests and maps the authenticated user and storage quota fields', async () => {
    axiosMocks.api.get.mockResolvedValue({
      data: {
        user: {
          permissionId: 'permission-1',
          displayName: 'Example User',
          emailAddress: 'user@example.com'
        },
        storageQuota: {
          limit: '1000000',
          usage: '250000'
        }
      }
    });

    let client = new GoogleDriveClient('token');
    await expect(client.getAbout()).resolves.toEqual({
      userId: 'permission-1',
      displayName: 'Example User',
      emailAddress: 'user@example.com',
      storageQuotaLimit: '1000000',
      storageQuotaUsage: '250000'
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith('/about', {
      params: { fields: 'user,storageQuota' }
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
