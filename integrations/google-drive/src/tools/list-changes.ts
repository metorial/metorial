import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient, normalizeGoogleDrivePageToken } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

let driveUserSchema = z.object({
  displayName: z.string().optional().describe("User's display name"),
  emailAddress: z.string().optional().describe("User's email address, when available"),
  photoLink: z.string().optional().describe("User's profile photo URL, when available"),
  permissionId: z.string().optional().describe("User's Drive permission ID")
});

let driveFileSchema = z.object({
  fileId: z.string().describe('Unique file identifier'),
  name: z.string().describe('Current file name'),
  mimeType: z.string().describe('Current file MIME type'),
  description: z.string().optional().describe('Current file description'),
  starred: z.boolean().optional().describe('Whether the file is starred'),
  trashed: z.boolean().optional().describe('Whether the file is in trash'),
  parents: z.array(z.string()).optional().describe('Current parent folder IDs'),
  webViewLink: z.string().optional().describe('Link to view the file in Drive'),
  webContentLink: z
    .string()
    .optional()
    .describe('Direct content download link, when available'),
  iconLink: z.string().optional().describe('Static icon URL for the file type'),
  thumbnailLink: z.string().optional().describe('Short-lived thumbnail URL, when available'),
  size: z.string().optional().describe('File size in bytes, when applicable'),
  createdTime: z.string().optional().describe('File creation timestamp'),
  modifiedTime: z.string().optional().describe('Last file modification timestamp'),
  sharedWithMeTime: z
    .string()
    .optional()
    .describe('Timestamp when the file was shared with the user'),
  owners: z.array(driveUserSchema).optional().describe('File owners, when available'),
  lastModifyingUser: driveUserSchema.optional().describe('User who last modified the file'),
  shared: z.boolean().optional().describe('Whether the file is shared'),
  capabilities: z
    .record(z.string(), z.boolean())
    .optional()
    .describe('Actions the authenticated user can perform on the file')
});

let sharedDriveSchema = z.object({
  driveId: z.string().describe('Unique shared drive identifier'),
  name: z.string().describe('Current shared drive name'),
  createdTime: z.string().optional().describe('Shared drive creation timestamp'),
  hidden: z.boolean().optional().describe('Whether the shared drive is hidden')
});

let driveChangeSchema = z.object({
  changeType: z.string().describe('Type of changed resource: file or drive'),
  time: z.string().describe('Timestamp of the change'),
  removed: z.boolean().describe('Whether the resource was removed or access was lost'),
  fileId: z.string().optional().describe('ID of the changed file'),
  file: driveFileSchema.optional().describe('Current file state, when still accessible'),
  driveId: z.string().optional().describe('ID of the changed shared drive'),
  drive: sharedDriveSchema
    .optional()
    .describe('Current shared drive state, when still accessible')
});

export let listChangesTool = SlateTool.create(spec, {
  name: 'List Changes',
  key: 'list_changes',
  description:
    'Get a fresh Google Drive changes page token or list file and shared-drive changes after a previously returned token.',
  instructions: [
    'Omit pageToken to get a fresh startPageToken for future change tracking; this initial call does not return historical changes.',
    'Pass startPageToken or nextPageToken as pageToken to retrieve changes.',
    'pageSize, includeRemoved, and spaces apply only when pageToken is supplied.',
    'Continue with nextPageToken until newStartPageToken is returned, then persist newStartPageToken for the next polling cycle.',
    'When using driveId, use a page token obtained with the same driveId.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleDriveActionScopes.listChanges)
  .input(
    z.object({
      pageToken: z
        .string()
        .optional()
        .describe(
          'Start or next page token returned by this tool; omit to request a fresh start token'
        ),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe(
          'Maximum changes to return when pageToken is supplied; Google Drive allows 1 to 1000'
        ),
      includeRemoved: z
        .boolean()
        .optional()
        .describe(
          'When pageToken is supplied, include resources removed by deletion or loss of access'
        ),
      driveId: z
        .string()
        .min(1)
        .optional()
        .describe('Shared drive ID; omit to track changes for the authenticated user'),
      spaces: z
        .enum(['drive', 'appDataFolder', 'drive,appDataFolder', 'appDataFolder,drive'])
        .optional()
        .describe(
          'When pageToken is supplied, comma-separated spaces to query: drive and/or appDataFolder'
        )
    })
  )
  .output(
    z.object({
      startPageToken: z
        .string()
        .optional()
        .describe('Fresh token for a future list request when pageToken was omitted'),
      changes: z.array(driveChangeSchema).describe('Changes returned for the requested page'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for the next page of the current change history'),
      newStartPageToken: z
        .string()
        .optional()
        .describe('Token to persist after reaching the end of the current change history')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let pageToken = normalizeGoogleDrivePageToken(ctx.input.pageToken);

    if (!pageToken) {
      let pageOnlyFields = [
        ctx.input.pageSize !== undefined ? 'pageSize' : undefined,
        ctx.input.includeRemoved !== undefined ? 'includeRemoved' : undefined,
        ctx.input.spaces !== undefined ? 'spaces' : undefined
      ].filter((field): field is string => field !== undefined);

      if (pageOnlyFields.length > 0) {
        throw createApiServiceError(
          `${pageOnlyFields.join(', ')} can only be used when pageToken is supplied. Omit these fields to get a fresh startPageToken.`,
          { reason: 'changes_page_options_require_page_token' }
        );
      }

      let startPageToken = await client.getStartPageToken(ctx.input.driveId);
      return {
        output: {
          startPageToken,
          changes: []
        },
        message: `Created a fresh changes page token${ctx.input.driveId ? ` for shared drive \`${ctx.input.driveId}\`` : ''}.`
      };
    }

    let result = await client.listChanges(pageToken, {
      pageSize: ctx.input.pageSize,
      driveId: ctx.input.driveId,
      includeRemoved: ctx.input.includeRemoved,
      spaces: ctx.input.spaces
    });

    return {
      output: {
        changes: result.changes.map(change => ({
          ...change,
          changeType: change.changeType || change.type
        })),
        nextPageToken: result.nextPageToken,
        newStartPageToken: result.newStartPageToken
      },
      message: `Found **${result.changes.length}** Drive change(s).`
    };
  })
  .build();
