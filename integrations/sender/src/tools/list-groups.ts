import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Retrieves a paginated list of all subscriber groups (mailing lists) in your Sender account. Returns group details including subscriber counts and engagement metrics.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID'),
            title: z.string().describe('Group title'),
            recipientCount: z.number().describe('Total subscriber count'),
            activeSubscribers: z.number().describe('Active subscriber count'),
            opensRate: z.number().describe('Open rate'),
            clickRate: z.number().describe('Click rate'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of groups'),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Total number of pages'),
      total: z.number().describe('Total number of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listGroups(ctx.input.page);

    return {
      output: {
        groups: result.data.map(g => ({
          groupId: g.id,
          title: g.title,
          recipientCount: g.recipient_count,
          activeSubscribers: g.active_subscribers,
          opensRate: g.opens_rate,
          clickRate: g.click_rate,
          createdAt: g.created
        })),
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page,
        total: result.meta.total
      },
      message: `Found **${result.meta.total}** group(s) (page ${result.meta.current_page}/${result.meta.last_page}).`
    };
  })
  .build();
