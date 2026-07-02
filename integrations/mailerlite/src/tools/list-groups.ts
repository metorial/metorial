import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Retrieves all subscriber groups in the account. Can filter by group name and includes statistics like active subscriber count, open rate, and click rate for each group.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter groups by name (partial match)'),
      limit: z.number().optional().describe('Number of groups per page'),
      page: z.number().optional().describe('Page number for pagination'),
      sort: z.string().optional().describe('Sort field (e.g., "name", "-name" for descending)')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID'),
            name: z.string().describe('Group name'),
            activeCount: z.number().optional().describe('Number of active subscribers'),
            sentCount: z.number().optional().describe('Number of emails sent to this group'),
            openRate: z.any().optional().describe('Open rate statistics'),
            clickRate: z.any().optional().describe('Click rate statistics'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listGroups({
      filter: ctx.input.name ? { name: ctx.input.name } : undefined,
      limit: ctx.input.limit,
      page: ctx.input.page,
      sort: ctx.input.sort
    });

    let groups = (result.data || []).map((g: any) => ({
      groupId: g.id,
      name: g.name,
      activeCount: g.active_count,
      sentCount: g.sent_count,
      openRate: g.open_rate,
      clickRate: g.click_rate,
      createdAt: g.created_at
    }));

    return {
      output: { groups },
      message: `Retrieved **${groups.length}** groups.`
    };
  })
  .build();
