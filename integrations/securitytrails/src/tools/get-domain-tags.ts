import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDomainTags = SlateTool.create(spec, {
  name: 'Get Domain Tags',
  key: 'get_domain_tags',
  description: `Retrieve categorized metadata tags for a domain. Tags provide classification and categorical information about the domain's purpose, technology, and characteristics.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      hostname: z.string().describe('Domain to retrieve tags for (e.g., "example.com")')
    })
  )
  .output(
    z
      .object({
        hostname: z.string().describe('The queried domain'),
        tags: z
          .array(
            z
              .object({
                type: z.string().optional().describe('Tag type/category'),
                value: z.string().optional().describe('Tag value')
              })
              .passthrough()
          )
          .describe('Domain tags')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getDomainTags(ctx.input.hostname);

    let tagList = result.tags ?? [];

    return {
      output: {
        hostname: ctx.input.hostname,
        tags: tagList,
        ...result
      },
      message: `Found **${tagList.length}** tags for **${ctx.input.hostname}**.`
    };
  })
  .build();
