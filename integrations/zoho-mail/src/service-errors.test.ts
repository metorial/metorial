import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { manageBookmarks } from './tools/manage-bookmarks';
import { manageFolders } from './tools/manage-folders';
import { manageLabels } from './tools/manage-labels';
import { manageNotes } from './tools/manage-notes';
import { manageOrganization } from './tools/manage-organization';
import { manageTasks } from './tools/manage-tasks';
import { updateEmail } from './tools/update-email';

let rejectedError = (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    error => error
  );

let invoke = (tool: { handleInvocation: (ctx: never) => Promise<unknown> }, input: object) =>
  tool.handleInvocation({ auth: { token: 'test-token', region: 'us' }, input } as never);

describe('Zoho Mail tool validation errors', () => {
  it.each([
    {
      name: 'bookmark groupId',
      invoke: () => invoke(manageBookmarks, { action: 'delete', scope: 'group' }),
      message: 'groupId is required for group bookmark operations'
    },
    {
      name: 'folder name',
      invoke: () => invoke(manageFolders, { accountId: 'account-1', action: 'create' }),
      message: 'folderName is required for create action'
    },
    {
      name: 'label ID',
      invoke: () => invoke(manageLabels, { accountId: 'account-1', action: 'update' }),
      message: 'labelId is required for update action'
    },
    {
      name: 'note content',
      invoke: () => invoke(manageNotes, { action: 'create', scope: 'personal' }),
      message: 'noteContent is required for create action'
    },
    {
      name: 'task title',
      invoke: () => invoke(manageTasks, { action: 'create', scope: 'personal' }),
      message: 'title is required for create action'
    },
    {
      name: 'organization action',
      invoke: () =>
        invoke(manageOrganization, { organizationId: 'organization-1', action: 'future' }),
      message: 'Unknown action: future'
    },
    {
      name: 'email source folder',
      invoke: () =>
        invoke(updateEmail, {
          accountId: 'account-1',
          messageIds: ['message-1'],
          action: 'delete'
        }),
      message: 'folderId is required for delete action'
    }
  ])('returns ServiceError for missing or unsupported $name', async ({ invoke, message }) => {
    let error = await rejectedError(invoke());

    expect(error).toBeInstanceOf(ServiceError);
    expect((error as Error).message).toContain(message);
  });
});
