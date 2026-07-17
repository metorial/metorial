import {
  createLocalSlateTestClient,
  describeMcpCompatibleToolSchemas,
  expectSlateContract
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { googleDriveActionScopes } from './scopes';

describe('google-drive provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-drive',
        name: 'Google Drive',
        description:
          'Upload, download, create, copy, move, rename, trash, and permanently delete files and folders in Google Drive. Search for files using complex queries filtering by name, MIME type, owner, modification date, labels, and other metadata. Share files and folders with specific users, groups, or domains with role-based permissions (owner, writer, commenter, reader). Manage shared drives and their members. Export Google Workspace files (Docs, Sheets, Slides) to standard formats like PDF, DOCX, and XLSX. Track file revision history and restore earlier versions. Create, read, update, and delete threaded comments and replies on files. Apply and read custom labels on files. Monitor file and folder changes via push notifications or webhook subscriptions. Store app-specific data in a hidden per-user folder.'
      },
      toolIds: [
        'search_files',
        'get_file',
        'create_file',
        'upload_file',
        'download_file',
        'export_file',
        'get_about',
        'update_file',
        'copy_file',
        'delete_file',
        'list_permissions',
        'share_file',
        'update_permission',
        'remove_permission',
        'list_comments',
        'create_comment',
        'reply_to_comment',
        'update_comment',
        'delete_comment',
        'list_revisions',
        'list_shared_drives',
        'create_shared_drive',
        'update_shared_drive',
        'delete_shared_drive',
        'list_changes'
      ],
      triggerIds: ['inbound_webhook', 'file_changes'],
      authMethodIds: ['oauth'],
      tools: [
        { id: 'search_files', readOnly: true, destructive: false },
        { id: 'get_file', readOnly: true, destructive: false },
        { id: 'create_file', readOnly: false, destructive: false },
        { id: 'upload_file', readOnly: false, destructive: false },
        { id: 'download_file', readOnly: true, destructive: false },
        { id: 'export_file', readOnly: true, destructive: false },
        { id: 'get_about', readOnly: true, destructive: false },
        { id: 'update_file', readOnly: false, destructive: false },
        { id: 'copy_file', readOnly: false, destructive: false },
        { id: 'delete_file', readOnly: false, destructive: true },
        { id: 'list_permissions', readOnly: true, destructive: false },
        { id: 'share_file', readOnly: false, destructive: false },
        { id: 'update_permission', readOnly: false, destructive: false },
        { id: 'remove_permission', readOnly: false, destructive: true },
        { id: 'list_comments', readOnly: true, destructive: false },
        { id: 'create_comment', readOnly: false, destructive: false },
        { id: 'reply_to_comment', readOnly: false, destructive: false },
        { id: 'update_comment', readOnly: false, destructive: true },
        { id: 'delete_comment', readOnly: false, destructive: true },
        { id: 'list_revisions', readOnly: true, destructive: false },
        { id: 'list_shared_drives', readOnly: true, destructive: false },
        { id: 'create_shared_drive', readOnly: false, destructive: false },
        { id: 'update_shared_drive', readOnly: false, destructive: false },
        { id: 'delete_shared_drive', readOnly: false, destructive: true },
        { id: 'list_changes', readOnly: true, destructive: false }
      ],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'file_changes', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(27);

    let expectedScopes = {
      search_files: googleDriveActionScopes.searchFiles,
      get_file: googleDriveActionScopes.getFile,
      create_file: googleDriveActionScopes.createFile,
      upload_file: googleDriveActionScopes.uploadFile,
      download_file: googleDriveActionScopes.downloadFile,
      export_file: googleDriveActionScopes.exportFile,
      get_about: googleDriveActionScopes.getAbout,
      update_file: googleDriveActionScopes.updateFile,
      copy_file: googleDriveActionScopes.copyFile,
      delete_file: googleDriveActionScopes.deleteFile,
      list_permissions: googleDriveActionScopes.listPermissions,
      share_file: googleDriveActionScopes.shareFile,
      update_permission: googleDriveActionScopes.updatePermission,
      remove_permission: googleDriveActionScopes.removePermission,
      list_comments: googleDriveActionScopes.listComments,
      create_comment: googleDriveActionScopes.createComment,
      reply_to_comment: googleDriveActionScopes.replyToComment,
      update_comment: googleDriveActionScopes.updateComment,
      delete_comment: googleDriveActionScopes.deleteComment,
      list_revisions: googleDriveActionScopes.listRevisions,
      list_shared_drives: googleDriveActionScopes.listSharedDrives,
      create_shared_drive: googleDriveActionScopes.createSharedDrive,
      update_shared_drive: googleDriveActionScopes.updateSharedDrive,
      delete_shared_drive: googleDriveActionScopes.deleteSharedDrive,
      list_changes: googleDriveActionScopes.listChanges,
      inbound_webhook: googleDriveActionScopes.inboundWebhook,
      file_changes: googleDriveActionScopes.fileChanges
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let scopeTitles = new Set(
      (oauth.authenticationMethod.scopes ?? []).map(scope => scope.title)
    );
    expect(scopeTitles.has('Full Access')).toBe(true);
    expect(scopeTitles.has('User Email')).toBe(true);
  });
});

describeMcpCompatibleToolSchemas('Google Drive tool input schemas', provider.actions);

describe('Google Drive search_files input schema', () => {
  it('exports the documented files.list pageSize maximum', () => {
    let action = provider.actions.find(child => child.key === 'search_files');
    let inputSchema = z.toJSONSchema(action?.inputSchema ?? z.object({})) as {
      properties?: Record<string, { maximum?: number }>;
    };

    expect(inputSchema.properties?.pageSize?.maximum).toBe(1000);
  });
});
