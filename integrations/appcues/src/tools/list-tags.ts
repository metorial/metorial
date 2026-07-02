import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all tags used to organize experiences in your Appcues account. Tags can be used to filter and categorize flows, checklists, and other experience types.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Unique identifier for the tag'),
            name: z.string().describe('Name of the tag')
          })
        )
        .describe('List of tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    let tagList = await client.listTags();
    let tags = Array.isArray(tagList) ? tagList : [];

    return {
      output: {
        tags: tags.map((t: any) => ({
          tagId: t.id || '',
          name: t.name || ''
        }))
      },
      message: `Found **${tags.length}** tags.`
    };
  })
  .build();
