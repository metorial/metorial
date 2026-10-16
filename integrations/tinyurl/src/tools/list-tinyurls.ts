import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listFiltersSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listTinyUrls = SlateTool.create(spec, {
  name: 'List TinyURLs',
  key: 'list_tinyurls',
  description: `List TinyURLs on your account. Filter by status (available or archived), date range, alias, or tag.
This also retrieves each matching link's details to include its destination and click count. Use count_tinyurls when only a total is needed.
Use the **search** parameter with format \`alias:value\` or \`tag:value\` to filter by alias or tag name.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(listFiltersSchema)
  .output(
    z.object({
      links: z
        .array(
          z.object({
            tinyUrl: z.string().describe('The shortened URL'),
            domain: z.string().describe('Domain of the shortened URL'),
            alias: z.string().describe('Alias portion of the shortened URL'),
            url: z.string().describe('The original destination URL'),
            hits: z.number().describe('Total number of clicks'),
            archived: z.boolean().describe('Whether the link is archived'),
            createdAt: z.string().describe('ISO 8601 creation timestamp'),
            expiresAt: z.string().nullable().describe('ISO 8601 expiration timestamp or null'),
            tags: z.array(z.string()).describe('Tags assigned to the link'),
            description: z.string().nullable().describe('Description of the link')
          })
        )
        .describe('List of TinyURLs matching the filters'),
      count: z.number().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.listTinyUrls({
      type: ctx.input.status,
      from: ctx.input.from,
      to: ctx.input.to,
      search: ctx.input.search
    });

    let links = (results || []).map(r => ({
      tinyUrl: r.tiny_url,
      domain: r.domain,
      alias: r.alias,
      url: r.url,
      hits: r.hits,
      archived: r.archived,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      tags: r.tags || [],
      description: r.description ?? null
    }));

    return {
      output: {
        links,
        count: links.length
      },
      message: `Found **${links.length}** ${ctx.input.status} TinyURL(s)`
    };
  })
  .build();
