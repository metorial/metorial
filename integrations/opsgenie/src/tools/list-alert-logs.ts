import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { getNextPageOffset } from '../lib/paging';
import { spec } from '../spec';

export let listAlertLogs = SlateTool.create(spec, {
  name: 'List Alert Logs',
  key: 'list_alert_logs',
  description: `List the activity log of an alert: creation, notifications, acknowledgements, assignments, escalations, and other state changes. Useful for reconstructing an alert timeline. Supports cursor pagination.`,
  instructions: ['When nextOffset is returned, pass it as offset to fetch the next page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      alertIdentifier: z.string().describe('Alert ID, tiny ID, or alias'),
      identifierType: z
        .enum(['id', 'tiny', 'alias'])
        .optional()
        .describe('Type of identifier provided. Defaults to "id"'),
      limit: z
        .number()
        .optional()
        .describe('Number of log entries to return (max 100, default 20)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order. Defaults to "desc"'),
      offset: z
        .string()
        .optional()
        .describe('Pagination cursor (nextOffset from a previous call)'),
      direction: z
        .enum(['next', 'prev'])
        .optional()
        .describe('Page direction relative to offset. Defaults to "next"')
    })
  )
  .output(
    z.object({
      logs: z.array(
        z.object({
          log: z.string().describe('Log message'),
          type: z.string().optional().describe('Log type (e.g., system, alertRecipient)'),
          owner: z.string().optional().describe('Who performed the activity'),
          createdAt: z.string().optional().describe('When the activity happened'),
          offset: z.string().optional().describe('Pagination offset of this entry')
        })
      ),
      nextOffset: z
        .string()
        .optional()
        .describe('Cursor to pass as offset to fetch the next page, when available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let response = await client.listAlertLogs(
      ctx.input.alertIdentifier,
      ctx.input.identifierType ?? 'id',
      {
        limit: ctx.input.limit,
        order: ctx.input.order,
        offset: ctx.input.offset,
        direction: ctx.input.direction
      }
    );

    let logs = (response.data ?? []).map((l: any) => ({
      log: l.log ?? '',
      type: l.type,
      owner: l.owner,
      createdAt: l.createdAt,
      offset: l.offset
    }));

    return {
      output: {
        logs,
        nextOffset: logs.length > 0 ? getNextPageOffset(response.paging) : undefined
      },
      message: `Found **${logs.length}** log entries for alert \`${ctx.input.alertIdentifier}\`.`
    };
  })
  .build();
