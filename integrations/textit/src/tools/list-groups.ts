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
      cursor: z
        .string()
        .optional()
        .describe('Opaque nextCursor from the previous response; keep the same filters.'),
      manualOnly: z
        .boolean()
        .optional()
        .describe('Restrict results to static groups with editable membership.'),
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
      nextCursor: z.string().nullable(),
      raw: z.unknown(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listGroups({
      cursor: ctx.input.cursor,
      uuid: ctx.input.groupUuid,
      manual_only:
        ctx.input.manualOnly === undefined ? undefined : Number(ctx.input.manualOnly),
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
        nextCursor: client.nextCursor(result),
        raw: result,
        hasMore: result.next !== null
      },
      message: `Found **${groups.length}** group(s).`
    };
  })
  .build();
