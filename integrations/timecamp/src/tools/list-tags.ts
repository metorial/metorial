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
  .input(z.object({}))
  .output(
    z.object({
      tags: z.array(
        z.object({
          tagId: z.string().describe('Tag ID'),
          name: z.string().describe('Tag name')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let rawTags = await client.getTags();

    let tagList: any[] = [];
    if (Array.isArray(rawTags)) {
      tagList = rawTags;
    } else if (rawTags && typeof rawTags === 'object') {
      tagList = Object.values(rawTags);
    }

    let mapped = tagList.map((t: any) => ({
      tagId: String(t.tag_id || t.id || ''),
      name: t.name || ''
    }));

    return {
      output: {
        tags: mapped
      },
      message: `Retrieved **${mapped.length}** tags.`
    };
  })
  .build();
