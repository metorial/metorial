import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `Retrieve all tags from TimeCamp. Tags can be assigned to tasks for categorizing tracked time.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tagListId: z
        .number()
        .optional()
        .describe(
          'Tag list ID from list_tag_lists. Omit to retrieve tags from all visible tag lists.'
        )
    })
  )
  .output(
    z.object({
      tags: z.array(
        z.object({
          tagId: z.string().describe('Tag ID'),
          name: z.string().describe('Tag name'),
          tagListId: z.string().describe('Containing tag list ID')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let tags = await client.getTags(ctx.input.tagListId);
    let mapped = tags.map(tag => ({
      tagId: String(tag.id ?? tag.tag_id ?? ''),
      name: String(tag.name ?? ''),
      tagListId: String(tag.tagListId)
    }));

    return {
      output: {
        tags: mapped
      },
      message: `Retrieved **${mapped.length}** tags.`
    };
  })
  .build();
