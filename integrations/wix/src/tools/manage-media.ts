import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { getNextCursor } from '../lib/client';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageMedia = SlateTool.create(spec, {
  name: 'Manage Media',
  key: 'manage_media',
  description: `Import and list media files (images, videos, audio) in a Wix site's media library.
Use **action** to specify the operation: \`import\` or \`list\`.
Import files from external URLs into the media library. List existing files optionally filtered by folder.`,
  instructions: [
    'Imports are processed asynchronously; the returned file may have operationStatus PENDING until Wix finishes processing it.',
    'If neither the URL nor displayName includes a file extension, pass mimeType.',
    'list returns files from the root folder unless parentFolderId is given; pass nextCursor as cursor to get the next page.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['import', 'list']).describe('Operation to perform'),
      url: z.string().optional().describe('External URL to import file from (for import)'),
      displayName: z
        .string()
        .optional()
        .describe('Display name for the imported file (for import)'),
      mimeType: z
        .string()
        .optional()
        .describe(
          'File MIME type, e.g. "image/png" (for import, when the URL has no extension)'
        ),
      parentFolderId: z.string().optional().describe('Folder ID to import into or list from'),
      mediaTypes: z
        .array(
          z.enum([
            'IMAGE',
            'VIDEO',
            'AUDIO',
            'DOCUMENT',
            'VECTOR',
            'ARCHIVE',
            'MODEL3D',
            'OTHER'
          ])
        )
        .optional()
        .describe('Only list files of these media types (for list)'),
      limit: z.number().optional().describe('Max items to return (for list, max 100)'),
      cursor: z.string().optional().describe('Pagination cursor for list')
    })
  )
  .output(
    z.object({
      file: z.any().optional().describe('Imported file data'),
      files: z.array(z.any()).optional().describe('List of media files'),
      nextCursor: z.string().optional().describe('Cursor for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);

    switch (ctx.input.action) {
      case 'import': {
        if (!ctx.input.url) throw createApiServiceError('url is required for import action');
        let result = await client.importFile({
          url: ctx.input.url,
          displayName: ctx.input.displayName,
          parentFolderId: ctx.input.parentFolderId,
          mimeType: ctx.input.mimeType
        });
        return {
          output: { file: result.file },
          message: `Imported media file${ctx.input.displayName ? ` **${ctx.input.displayName}**` : ''} from URL (ID: ${result.file?.id})`
        };
      }
      case 'list': {
        let result = await client.listFiles({
          parentFolderId: ctx.input.parentFolderId,
          mediaTypes: ctx.input.mediaTypes,
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        });
        let files = result.files || [];
        return {
          output: {
            files,
            nextCursor: getNextCursor(result)
          },
          message: `Found **${files.length}** media files`
        };
      }
    }
  })
  .build();
