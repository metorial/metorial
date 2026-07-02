import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { spec } from '../spec';

export let fileChanges = SlateTrigger.create(spec, {
  name: 'File Changes',
  key: 'file_changes',
  description:
    'Triggers when files or folders are created, modified, deleted, or moved in Dropbox. Uses cursor-based polling to detect changes.'
})
  .input(
    z.object({
      changeType: z.string().describe('Type of change: file, folder, or deleted'),
      name: z.string().describe('Name of the changed entry'),
      pathDisplay: z.string().optional().describe('Display path of the changed entry'),
      pathLower: z.string().optional().describe('Lowercased path of the changed entry'),
      entryId: z.string().optional().describe('Unique ID of the changed entry'),
      rev: z.string().optional().describe('File revision (files only)'),
      size: z.number().optional().describe('File size in bytes (files only)'),
      serverModified: z
        .string()
        .optional()
        .describe('Server modification timestamp (files only)'),
      clientModified: z
        .string()
        .optional()
        .describe('Client modification timestamp (files only)'),
      isDownloadable: z
        .boolean()
        .optional()
        .describe('Whether the file is downloadable (files only)')
    })
  )
  .output(
    z.object({
      entryType: z.string().describe('Type of entry: file, folder, or deleted'),
      name: z.string().describe('Name of the changed entry'),
      pathDisplay: z.string().optional().describe('Display path'),
      pathLower: z.string().optional().describe('Lowercased path'),
      entryId: z.string().optional().describe('Unique ID'),
      rev: z.string().optional().describe('File revision'),
      size: z.number().optional().describe('File size in bytes'),
      serverModified: z.string().optional().describe('Server modification timestamp'),
      clientModified: z.string().optional().describe('Client modification timestamp'),
      isDownloadable: z.boolean().optional().describe('Whether the file is downloadable')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DropboxClient(ctx.auth.token);
      let cursor = ctx.state?.cursor as string | undefined;

      if (!cursor) {
        let result = await client.listFolderGetLatestCursor('', true);
        return {
          inputs: [],
          updatedState: { cursor: result.cursor }
        };
      }

      let allEntries: any[] = [];
      let currentCursor = cursor;
      let hasMore = true;

      while (hasMore) {
        let result = await client.listFolderContinue(currentCursor);
        let entries = result.entries || [];
        allEntries.push(...entries);
        currentCursor = result.cursor;
        hasMore = result.has_more;
      }

      let inputs = allEntries.map((entry: any) => ({
        changeType: entry['.tag'] as string,
        name: entry.name as string,
        pathDisplay: entry.path_display as string | undefined,
        pathLower: entry.path_lower as string | undefined,
        entryId: entry.id as string | undefined,
        rev: entry.rev as string | undefined,
        size: entry.size as number | undefined,
        serverModified: entry.server_modified as string | undefined,
        clientModified: entry.client_modified as string | undefined,
        isDownloadable: entry.is_downloadable as boolean | undefined
      }));

      return {
        inputs,
        updatedState: { cursor: currentCursor }
      };
    },

    handleEvent: async ctx => {
      let changeType = ctx.input.changeType;
      let eventType =
        changeType === 'deleted' ? 'deleted' : changeType === 'folder' ? 'folder' : 'file';
      let entryId = ctx.input.entryId || ctx.input.pathLower || ctx.input.name;
      let deduplicationId = `${entryId}:${ctx.input.rev || ctx.input.serverModified || Date.now()}`;

      return {
        type: `file.${changeType === 'deleted' ? 'deleted' : 'changed'}`,
        id: deduplicationId,
        output: {
          entryType: eventType,
          name: ctx.input.name,
          pathDisplay: ctx.input.pathDisplay,
          pathLower: ctx.input.pathLower,
          entryId: ctx.input.entryId,
          rev: ctx.input.rev,
          size: ctx.input.size,
          serverModified: ctx.input.serverModified,
          clientModified: ctx.input.clientModified,
          isDownloadable: ctx.input.isDownloadable
        }
      };
    }
  })
  .build();
