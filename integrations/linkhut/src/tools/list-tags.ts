import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `Retrieve all tags in the user's account along with the number of times each tag has been used. Useful for understanding tagging patterns and finding frequently used tags.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      tags: z.record(z.string(), z.number()).describe('Map of tag names to usage counts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let tagCounts = await client.getTags();
    let tagCount = Object.keys(tagCounts).length;

    return {
      output: { tags: tagCounts },
      message: `Found **${tagCount}** tag(s) in the account.`
    };
  })
  .build();
