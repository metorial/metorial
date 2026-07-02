import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tagResultSchema = z
  .object({
    domain: z.string().optional().describe('Related domain name'),
    tag: z.string().optional().describe('Tag or attribute linking the domains')
  })
  .passthrough();

export let getDomainTags = SlateTool.create(spec, {
  name: 'Get Domain Tags',
  key: 'get_domain_tags',
  description: `Return lists of related domains based on shared IP addresses and other site attributes. Useful for discovering domains on the same infrastructure or with shared characteristics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain to get tags for (e.g., "example.com")')
    })
  )
  .output(
    z.object({
      tags: z
        .array(tagResultSchema)
        .describe('Related domains and their connection attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.tags(ctx.input.domain);

    let tags = data?.Results ?? [];

    return {
      output: {
        tags
      },
      message: `Found **${tags.length}** related domain(s) for **${ctx.input.domain}**.`
    };
  });
