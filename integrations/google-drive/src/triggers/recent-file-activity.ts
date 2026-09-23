import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';
import { recentFileEventId, recentFileInputSchema } from './event-schemas';
import { recentFileEvents } from './recent-file-events-trigger-group';

export let recentFileActivityTrigger = SlateTrigger.create(spec, {
  name: 'Recent File Activity',
  key: 'recent_file_activity',
  description:
    'Find recently modified My Drive files and shared-drive files the connected user has accessed. Includes the current trash state but cannot report permanent deletions.'
})
  .triggerGroup(recentFileEvents)
  .scopes(googleDriveActionScopes.recentFileActivity)
  .input(recentFileInputSchema)
  .output(
    z.object({
      fileId: z.string().describe('ID of the file'),
      fileName: z.string().describe('Current name of the file'),
      mimeType: z.string().describe('MIME type of the file'),
      trashed: z.boolean().describe('Whether the file is currently in trash'),
      parents: z.array(z.string()).optional().describe('Current parent folder IDs'),
      webViewLink: z.string().optional().describe('Link to view the file'),
      modifiedTime: z.string().describe('Current file modification timestamp'),
      lastModifyingUserName: z.string().optional().describe('Last modifying user name'),
      lastModifyingUserEmail: z.string().optional().describe('Last modifying user email')
    })
  )
  .matches(
    payload =>
      payload !== null &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      recentFileInputSchema.safeParse(payload).success
  )
  .map(async ctx => ({
    type: 'file.recently_modified',
    id: recentFileEventId(ctx.input.fileId, ctx.input.modifiedTime, ctx.input.trashed),
    output: {
      fileId: ctx.input.fileId,
      fileName: ctx.input.fileName,
      mimeType: ctx.input.mimeType,
      trashed: ctx.input.trashed,
      parents: ctx.input.parents,
      webViewLink: ctx.input.webViewLink,
      modifiedTime: ctx.input.modifiedTime,
      lastModifyingUserName: ctx.input.lastModifyingUser?.displayName,
      lastModifyingUserEmail: ctx.input.lastModifyingUser?.emailAddress
    }
  }))
  .build();
