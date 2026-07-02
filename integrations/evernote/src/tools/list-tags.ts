import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTagsTool = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all tags in the user's account, or only tags used within a specific notebook. Tags can form a hierarchy via parent-child relationships.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      notebookGuid: z
        .string()
        .optional()
        .describe('Optional notebook GUID to list only tags used in that notebook')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagGuid: z.string().describe('Unique identifier of the tag'),
            name: z.string().describe('Name of the tag'),
            parentGuid: z
              .string()
              .optional()
              .describe('GUID of the parent tag, if this is a child tag')
          })
        )
        .describe('List of tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      noteStoreUrl: ctx.auth.noteStoreUrl
    });

    let tags = ctx.input.notebookGuid
      ? await client.listTagsByNotebook(ctx.input.notebookGuid)
      : await client.listTags();

    let result = tags.map(t => ({
      tagGuid: t.tagGuid || '',
      name: t.name || '',
      parentGuid: t.parentGuid
    }));

    return {
      output: { tags: result },
      message: `Found **${result.length}** tag(s).`
    };
  })
  .build();
