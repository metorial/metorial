import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let driveClientMocks = vi.hoisted(() => ({
  getAbout: vi.fn(),
  getStartPageToken: vi.fn(),
  listChanges: vi.fn(),
  updateComment: vi.fn(),
  updateReply: vi.fn()
}));

vi.mock('./lib/client', async importOriginal => {
  let actual = await importOriginal<typeof import('./lib/client')>();

  return {
    ...actual,
    GoogleDriveClient: class {
      getAbout(...args: unknown[]) {
        return driveClientMocks.getAbout(...args);
      }

      getStartPageToken(...args: unknown[]) {
        return driveClientMocks.getStartPageToken(...args);
      }

      listChanges(...args: unknown[]) {
        return driveClientMocks.listChanges(...args);
      }

      updateComment(...args: unknown[]) {
        return driveClientMocks.updateComment(...args);
      }

      updateReply(...args: unknown[]) {
        return driveClientMocks.updateReply(...args);
      }
    }
  };
});

import { provider } from './index';

let createDriveToolTestClient = () =>
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

describe('Google Drive Phase 2 tool behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates a parent comment when replyId is omitted', async () => {
    driveClientMocks.updateComment.mockResolvedValue({
      commentId: 'comment-1',
      content: 'Updated comment',
      createdTime: '2026-07-14T08:00:00Z',
      modifiedTime: '2026-07-14T09:00:00Z',
      author: { displayName: 'Example User' },
      resolved: false
    });
    let client = createDriveToolTestClient();

    let result = await client.invokeTool('update_comment', {
      fileId: 'file-1',
      commentId: 'comment-1',
      content: 'Updated comment'
    });

    expect(driveClientMocks.updateComment).toHaveBeenCalledWith(
      'file-1',
      'comment-1',
      'Updated comment'
    );
    expect(driveClientMocks.updateReply).not.toHaveBeenCalled();
    expect(result.output).toMatchObject({
      fileId: 'file-1',
      commentId: 'comment-1',
      updatedResource: 'comment',
      content: 'Updated comment',
      resolved: false
    });
  });

  it('updates a reply when replyId is provided', async () => {
    driveClientMocks.updateReply.mockResolvedValue({
      replyId: 'reply-1',
      content: 'Updated reply',
      createdTime: '2026-07-14T08:00:00Z',
      modifiedTime: '2026-07-14T09:00:00Z',
      author: { displayName: 'Example User' }
    });
    let client = createDriveToolTestClient();

    let result = await client.invokeTool('update_comment', {
      fileId: 'file-1',
      commentId: 'comment-1',
      replyId: 'reply-1',
      content: 'Updated reply'
    });

    expect(driveClientMocks.updateReply).toHaveBeenCalledWith(
      'file-1',
      'comment-1',
      'reply-1',
      'Updated reply'
    );
    expect(driveClientMocks.updateComment).not.toHaveBeenCalled();
    expect(result.output).toMatchObject({
      fileId: 'file-1',
      commentId: 'comment-1',
      replyId: 'reply-1',
      updatedResource: 'reply',
      content: 'Updated reply'
    });
  });

  it('returns authenticated user and storage quota information', async () => {
    driveClientMocks.getAbout.mockResolvedValue({
      userId: 'permission-1',
      displayName: 'Example User',
      emailAddress: 'user@example.com',
      storageQuotaLimit: '1000000',
      storageQuotaUsage: '250000'
    });
    let client = createDriveToolTestClient();

    let result = await client.invokeTool('get_about', {});

    expect(driveClientMocks.getAbout).toHaveBeenCalledWith();
    expect(result.output).toEqual({
      userId: 'permission-1',
      displayName: 'Example User',
      emailAddress: 'user@example.com',
      storageQuotaLimit: '1000000',
      storageQuotaUsage: '250000'
    });
  });

  it('accepts a partial Drive user object without failing output validation', async () => {
    driveClientMocks.getAbout.mockResolvedValue({
      userId: undefined,
      displayName: undefined,
      emailAddress: undefined,
      storageQuotaUsage: '250000'
    });
    let client = createDriveToolTestClient();

    let result = await client.invokeTool('get_about', {});

    expect(result.output).toEqual({
      storageQuotaUsage: '250000'
    });
  });

  it('returns a fresh shared-drive start token when pageToken is omitted', async () => {
    driveClientMocks.getStartPageToken.mockResolvedValue('start-token');
    let client = createDriveToolTestClient();

    let result = await client.invokeTool('list_changes', {
      driveId: 'drive-1'
    });

    expect(driveClientMocks.getStartPageToken).toHaveBeenCalledWith('drive-1');
    expect(driveClientMocks.listChanges).not.toHaveBeenCalled();
    expect(result.output).toEqual({
      startPageToken: 'start-token',
      changes: []
    });
  });

  it('lists changes with paging and shared-drive parameters', async () => {
    driveClientMocks.listChanges.mockResolvedValue({
      changes: [
        {
          changeType: 'file',
          time: '2026-07-14T09:00:00Z',
          removed: false,
          fileId: 'file-1',
          file: {
            fileId: 'file-1',
            name: 'Example document',
            mimeType: 'application/vnd.google-apps.document'
          }
        }
      ],
      nextPageToken: 'next-token'
    });
    let client = createDriveToolTestClient();

    let result = await client.invokeTool('list_changes', {
      pageToken: ' start-token ',
      pageSize: 250,
      includeRemoved: true,
      driveId: 'drive-1',
      spaces: 'drive'
    });

    expect(driveClientMocks.listChanges).toHaveBeenCalledWith('start-token', {
      pageSize: 250,
      driveId: 'drive-1',
      includeRemoved: true,
      spaces: 'drive'
    });
    expect(result.output).toMatchObject({
      changes: [
        {
          changeType: 'file',
          fileId: 'file-1'
        }
      ],
      nextPageToken: 'next-token'
    });
  });

  it('rejects placeholder change tokens as a user-facing error', async () => {
    let client = createDriveToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('list_changes', {
          pageToken: '(no output)'
        }),
      'Invalid pageToken "(no output)". Omit pageToken unless it is exactly the nextPageToken returned by a previous Google Drive response.'
    );
    expect(driveClientMocks.listChanges).not.toHaveBeenCalled();
  });

  it('rejects page-only change options when requesting a fresh start token', async () => {
    let client = createDriveToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('list_changes', {
          pageSize: 250,
          includeRemoved: true,
          spaces: 'drive'
        }),
      'pageSize, includeRemoved, spaces can only be used when pageToken is supplied. Omit these fields to get a fresh startPageToken.'
    );
    expect(driveClientMocks.getStartPageToken).not.toHaveBeenCalled();
    expect(driveClientMocks.listChanges).not.toHaveBeenCalled();
  });
});
