import { SlateTool } from 'slates';
import { z } from 'zod';
import { GammaClient } from '../lib/client';
import { spec } from '../spec';

export let listFoldersTool = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description: `Retrieve folders from your Gamma workspace. Use folder IDs when generating content to organize it into specific folders.
You must be a member of a folder to add content to it.`,
  instructions: [
    'Use the query parameter to search folders by name (case-sensitive).',
    'Use the nextCursor from a previous response in the "after" parameter to paginate through results.'
  ],
  constraints: [
    'Maximum 50 folders per page.',
    'You must be a member of a folder to add content to it.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search folders by name (case-sensitive)'),
      limit: z.number().optional().describe('Number of folders per page (max 50)'),
      after: z.string().optional().describe('Cursor token for fetching the next page')
    })
  )
  .output(
    z.object({
      folders: z
        .array(
          z.object({
            folderId: z
              .string()
              .describe('Unique folder identifier to use in content generation'),
            name: z.string().describe('Display name of the folder')
          })
        )
        .describe('List of available folders'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().optional().describe('Cursor token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GammaClient(ctx.auth.token);

    let result = await client.listFolders({
      query: ctx.input.query,
      limit: ctx.input.limit,
      after: ctx.input.after
    });

    let folders = result.data.map(folder => ({
      folderId: folder.id,
      name: folder.name
    }));

    let message = `Found **${folders.length}** folder(s)`;
    if (result.hasMore) {
      message += ` (more available)`;
    }
    message += `:\n${folders.map(f => `- **${f.name}** - ID: \`${f.folderId}\``).join('\n')}`;

    return {
      output: {
        folders,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor
      },
      message
    };
  });
