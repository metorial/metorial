import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageMedia = SlateTool.create(spec, {
  name: 'Manage Media',
  key: 'manage_media',
  description: `Import and list media files (images, videos, audio) in a Wix site's media library.
Use **action** to specify the operation: \`import\` or \`list\`.
Import files from external URLs into the media library. List existing files optionally filtered by folder.`,
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
      parentFolderId: z.string().optional().describe('Folder ID to import into or list from'),
      limit: z.number().optional().describe('Max items to return (for list)'),
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
        let result = await client.importFile(
          ctx.input.url,
          ctx.input.displayName,
          ctx.input.parentFolderId
        );
        return {
          output: { file: result.file },
          message: `Imported media file${ctx.input.displayName ? ` **${ctx.input.displayName}**` : ''} from URL`
        };
      }
      case 'list': {
        let result = await client.listFiles({
          parentFolderId: ctx.input.parentFolderId,
          paging: { limit: ctx.input.limit, cursor: ctx.input.cursor }
        });
        let files = result.files || [];
        return {
          output: {
            files,
            nextCursor: result.nextCursor
          },
          message: `Found **${files.length}** media files`
        };
      }
    }
  })
  .build();
