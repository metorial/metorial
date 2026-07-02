import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLeadHistory = SlateTool.create(spec, {
  name: 'Get Lead History',
  key: 'get_lead_history',
  description: `Retrieve the full action history of a lead, including events like creation, status changes, step changes, user assignments, comments, emails sent, and amounts set. Filterable by date range, action type, and user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead'),
      startDate: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      actionType: z
        .string()
        .optional()
        .describe('Filter by action type (e.g. status_changed, step_changed, comment_added)'),
      userId: z.number().optional().describe('Filter by user ID who performed the action')
    })
  )
  .output(
    z.object({
      actions: z.array(
        z.object({
          actionId: z.number().optional().describe('Action history entry ID'),
          actionType: z.string().describe('Type of action performed'),
          userId: z.number().optional().describe('User who performed the action'),
          createdAt: z.string().optional().describe('When the action occurred'),
          content: z.any().optional().describe('Additional action details')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let history = await client.getLeadActionHistory(ctx.input.leadId, {
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      actionType: ctx.input.actionType,
      userId: ctx.input.userId
    });

    let actions = history.map((entry: any) => ({
      actionId: entry.id,
      actionType: entry.action_type || entry.type,
      userId: entry.user_id,
      createdAt: entry.created_at,
      content: entry.content || entry.description
    }));

    return {
      output: { actions },
      message: `Retrieved **${actions.length}** history entries for lead ${ctx.input.leadId}.`
    };
  })
  .build();
