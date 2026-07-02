import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMeetingRequest = SlateTool.create(spec, {
  name: 'Manage Meeting Request',
  key: 'manage_meeting_request',
  description: `List, delete, or send reminders for meeting requests. Use this to check the status of active/upcoming/closed requests, cancel a request, or nudge contacts who haven't responded.`,
  instructions: [
    'To list requests, provide no requestId. Optionally filter by state.',
    'To delete or remind, provide the requestId and set the corresponding action.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'delete', 'remind']).describe('Action to perform'),
      requestId: z
        .string()
        .optional()
        .describe('Meeting request ID (required for delete and remind)'),
      state: z
        .enum(['active', 'upcoming', 'closed'])
        .optional()
        .describe('Filter by request state (only for list action)'),
      skip: z
        .number()
        .optional()
        .describe('Number of results to skip for pagination (only for list)'),
      take: z.number().optional().describe('Number of results to return (only for list)')
    })
  )
  .output(
    z.object({
      requests: z
        .array(
          z.object({
            requestId: z.string().optional(),
            subject: z.string().optional(),
            state: z.string().optional(),
            dateStart: z.string().optional(),
            dateEnd: z.string().optional(),
            raw: z.any().optional()
          })
        )
        .optional()
        .describe('List of meeting requests (for list action)'),
      success: z
        .boolean()
        .optional()
        .describe('Whether the action succeeded (for delete/remind)'),
      raw: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.action === 'list') {
      let data = await client.listMeetingRequests({
        state: ctx.input.state,
        skip: ctx.input.skip,
        take: ctx.input.take
      });

      let requests = Array.isArray(data) ? data : data?.tasks || data?.requests || [];
      let mapped = requests.map((r: any) => ({
        requestId: r._id || r.id,
        subject: r.subject || r.title,
        state: r.state || r.status,
        dateStart: r.dateStart,
        dateEnd: r.dateEnd,
        raw: r
      }));

      return {
        output: { requests: mapped, raw: data },
        message: `Found **${mapped.length}** meeting request(s)${ctx.input.state ? ` with state "${ctx.input.state}"` : ''}.`
      };
    }

    if (!ctx.input.requestId) {
      throw new Error('requestId is required for delete and remind actions');
    }

    if (ctx.input.action === 'delete') {
      let result = await client.deleteMeetingRequest(ctx.input.requestId);
      return {
        output: { success: true, raw: result },
        message: `Meeting request **${ctx.input.requestId}** deleted.`
      };
    }

    if (ctx.input.action === 'remind') {
      let result = await client.sendMeetingReminder(ctx.input.requestId);
      return {
        output: { success: true, raw: result },
        message: `Reminder sent for meeting request **${ctx.input.requestId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
