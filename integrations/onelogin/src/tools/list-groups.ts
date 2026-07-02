import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List all groups in OneLogin. Groups function as security boundaries to apply specific security policies to sets of users.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.number().describe('Group ID'),
            name: z.string().describe('Group name'),
            reference: z.string().nullable().optional().describe('Group reference identifier')
          })
        )
        .describe('List of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let data = await client.listGroups();
    let groups = Array.isArray(data) ? data : data.data || [];

    let mapped = groups.map((g: any) => ({
      groupId: g.id,
      name: g.name,
      reference: g.reference
    }));

    return {
      output: { groups: mapped },
      message: `Found **${mapped.length}** group(s).`
    };
  });
