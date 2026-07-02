import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

export let listTagsTool = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `Retrieve all tags in the Monday.com account. Tags are used to label and categorize items across boards.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Tag ID'),
            name: z.string().describe('Tag name'),
            color: z.string().nullable().describe('Tag color')
          })
        )
        .describe('List of tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let tags = await client.getTags();

    let mapped = tags.map((t: any) => ({
      tagId: String(t.id),
      name: t.name,
      color: t.color || null
    }));

    return {
      output: { tags: mapped },
      message: `Found **${mapped.length}** tag(s).`
    };
  })
  .build();
