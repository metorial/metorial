import { SlateTool } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { spec } from '../spec';

let groupSchema = z.object({
  groupId: z.string().describe('Unique identifier of the group'),
  name: z.string().describe('Name of the group'),
  createdAt: z.string().optional().describe('Timestamp when the group was created')
});

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List all groups in the Fivetran account. Groups are organizational containers that hold destinations, connectors, users, and other resources.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z.array(groupSchema).describe('List of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let items = await client.listGroups();

    let groups = items.map((g: any) => ({
      groupId: g.id,
      name: g.name,
      createdAt: g.created_at
    }));

    return {
      output: { groups },
      message: `Found **${groups.length}** group(s).`
    };
  })
  .build();
