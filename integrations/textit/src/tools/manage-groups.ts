import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageGroups = SlateTool.create(spec, {
  name: 'Manage Groups',
  key: 'manage_groups',
  description: `Create, update, or delete contact groups. Groups are used to organize contacts and target them in campaigns and broadcasts.`,
  instructions: ['Groups with active campaigns or triggers cannot be deleted.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      groupUuid: z
        .string()
        .optional()
        .describe('UUID of the group (required for update/delete)'),
      name: z
        .string()
        .optional()
        .describe('Name of the group (required for create and update)')
    })
  )
  .output(
    z.object({
      groupUuid: z.string().optional().describe('UUID of the group'),
      name: z.string().optional().describe('Name of the group'),
      query: z.string().nullable().optional().describe('Smart group query (if applicable)'),
      status: z.string().optional().describe('Status of the group'),
      count: z.number().optional().describe('Number of contacts in the group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.action === 'delete') {
      await client.deleteGroup(ctx.input.groupUuid!);
      return {
        output: {},
        message: `Group deleted successfully.`
      };
    }

    let group: any;
    if (ctx.input.action === 'create') {
      group = await client.createGroup({ name: ctx.input.name! });
    } else {
      group = await client.updateGroup(ctx.input.groupUuid!, { name: ctx.input.name! });
    }

    return {
      output: {
        groupUuid: group.uuid,
        name: group.name,
        query: group.query,
        status: group.status,
        count: group.count
      },
      message: `Group **${group.name}** ${ctx.input.action === 'create' ? 'created' : 'updated'} successfully.`
    };
  })
  .build();
