import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all tags and tag folders in the church database. Returns tags with their IDs, names, and folder assignments, along with the folder hierarchy. Optionally filter tags by folder.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Filter tags to a specific folder ID'),
      includeFolders: z
        .boolean()
        .optional()
        .describe('Set to true to also return the folder hierarchy')
    })
  )
  .output(
    z.object({
      tags: z.array(z.any()).describe('Array of tag objects'),
      folders: z
        .array(z.any())
        .optional()
        .describe('Array of tag folder objects (when includeFolders is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let tags = await client.listTags(ctx.input.folderId);
    let tagsArray = Array.isArray(tags) ? tags : [];

    let folders: unknown[] | undefined;
    if (ctx.input.includeFolders) {
      let foldersResult = await client.listTagFolders();
      folders = Array.isArray(foldersResult) ? foldersResult : [];
    }

    return {
      output: { tags: tagsArray, folders },
      message: `Found **${tagsArray.length}** tags${folders ? ` and **${folders.length}** folders` : ''}.`
    };
  })
  .build();
