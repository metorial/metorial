import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Retrieve contact groups from your TextIt workspace. Filter by UUID or name. Returns groups with their contact counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupUuid: z.string().optional().describe('Filter by group UUID'),
      name: z.string().optional().describe('Filter by group name')
    })
  )
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupUuid: z.string(),
          name: z.string(),
          query: z.string().nullable(),
          status: z.string(),
          system: z.boolean(),
          count: z.number()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listGroups({
      uuid: ctx.input.groupUuid,
      name: ctx.input.name
    });

    let groups = result.results.map(g => ({
      groupUuid: g.uuid,
      name: g.name,
      query: g.query,
      status: g.status,
      system: g.system,
      count: g.count
    }));

    return {
      output: {
        groups,
        hasMore: result.next !== null
      },
      message: `Found **${groups.length}** group(s).`
    };
  })
  .build();
