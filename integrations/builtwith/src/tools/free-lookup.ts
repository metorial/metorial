import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let groupSchema = z
  .object({
    name: z.string().optional().describe('Technology group name'),
    categories: z
      .array(
        z
          .object({
            name: z.string().optional().describe('Category name'),
            count: z.number().optional().describe('Number of technologies in this category'),
            lastUpdated: z.string().optional().describe('Last updated timestamp')
          })
          .passthrough()
      )
      .optional()
      .describe('Categories within this group')
  })
  .passthrough();

export let freeLookup = SlateTool.create(spec, {
  name: 'Free Technology Summary',
  key: 'free_lookup',
  description: `Get a lightweight technology summary for a website including last-updated timestamps and counts for technology groups and categories. This is the free-tier alternative to the full domain lookup — provides an overview without detailed technology breakdowns.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .describe('Domain to get a technology summary for (e.g., "example.com")')
    })
  )
  .output(
    z.object({
      groups: z.array(groupSchema).describe('Technology groups and category counts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.freeLookup(ctx.input.domain);

    let groups = data?.groups ?? data?.Groups ?? [];

    return {
      output: {
        groups
      },
      message: `Retrieved technology summary for **${ctx.input.domain}** with **${groups.length}** technology group(s).`
    };
  });
