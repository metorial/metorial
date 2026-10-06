import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getActions = SlateTool.create(spec, {
  name: 'List Alert Actions',
  key: 'list_actions',
  description: `Lists alert actions (notifications) that have been generated for your account. Supports filtering by time range, check IDs, contact IDs, and alert status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      from: z.number().optional().describe('Start timestamp (Unix epoch)'),
      to: z.number().optional().describe('End timestamp (Unix epoch)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of actions to return (default 100)'),
      offset: z.number().optional().describe('Offset for pagination'),
      checkIds: z.string().optional().describe('Comma-separated check IDs to filter by'),
      contactIds: z
        .string()
        .optional()
        .describe('Legacy alias for comma-separated alerted user IDs'),
      userIds: z
        .string()
        .optional()
        .describe('Comma-separated alerted user IDs; takes precedence over contactIds'),
      status: z
        .string()
        .optional()
        .describe(
          'Filter by status: "sent", "delivered", "error", "not_delivered", "no_credits"'
        ),
      via: z
        .string()
        .optional()
        .describe('Filter by channel: "email", "sms", "twitter", "iphone", "android"')
    })
  )
  .output(
    z.object({
      actions: z
        .object({
          alerts: z.array(z.any()).optional().describe('Alert actions')
        })
        .describe('Alert actions grouped by type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.listActions({
      from: ctx.input.from,
      to: ctx.input.to,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      checkids: ctx.input.checkIds,
      userids: ctx.input.userIds ?? ctx.input.contactIds,
      status:
        ctx.input.status === 'not_delivered'
          ? 'notdelivered'
          : ctx.input.status === 'no_credits'
            ? 'nocredits'
            : ctx.input.status,
      via:
        ctx.input.via === 'iphone'
          ? 'apns'
          : ctx.input.via === 'android'
            ? 'agcm'
            : ctx.input.via
    });

    return {
      output: {
        actions: result.actions
      },
      message: `Retrieved alert actions.`
    };
  })
  .build();
