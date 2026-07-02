import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContactGroups = SlateTool.create(spec, {
  name: 'List Contact Groups',
  key: 'list_contact_groups',
  description: `List all contact groups on your StatusCake account. Contact groups define how alerts are routed and can include email addresses, mobile numbers, integrations, and webhook URLs.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      limit: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      groups: z.array(z.record(z.string(), z.any())).describe('List of contact group objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContactGroups({
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let groups = result?.data ?? [];

    return {
      output: { groups },
      message: `Found **${groups.length}** contact group(s).`
    };
  })
  .build();
