import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let listAlerts = SlateTool.create(spec, {
  name: 'List Alerts',
  key: 'list_alerts',
  description: `List and search alerts in OpsGenie. Supports filtering by query, pagination, and sorting. Use the query parameter with OpsGenie search syntax (e.g., \`status=open\`, \`tag=critical\`, \`priority=P1\`).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Search query using OpsGenie search syntax (e.g., "status=open AND priority=P1")'
        ),
      offset: z.number().optional().describe('Start index for pagination (default 0)'),
      limit: z
        .number()
        .optional()
        .describe('Number of alerts to return (max 100, default 20)'),
      sort: z
        .enum([
          'createdAt',
          'updatedAt',
          'tinyId',
          'alias',
          'message',
          'status',
          'acknowledged',
          'isSeen',
          'snoozed',
          'snoozedUntil',
          'count',
          'lastOccurredAt',
          'source',
          'owner',
          'integration.name',
          'integration.type',
          'report.ackTime',
          'report.closeTime',
          'report.acknowledgedBy',
          'report.closedBy'
        ])
        .optional()
        .describe('Field to sort by'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      searchIdentifier: z.string().optional().describe('Saved search identifier to use'),
      searchIdentifierType: z
        .enum(['id', 'name'])
        .optional()
        .describe('Type of saved search identifier')
    })
  )
  .output(
    z.object({
      alerts: z.array(
        z.object({
          alertId: z.string().describe('Unique alert ID'),
          tinyId: z.string().optional().describe('Short numeric alert ID'),
          alias: z.string().optional().describe('Alert alias'),
          message: z.string().describe('Alert message'),
          status: z.string().describe('Alert status'),
          acknowledged: z.boolean().describe('Whether acknowledged'),
          isSeen: z.boolean().describe('Whether seen'),
          tags: z.array(z.string()).describe('Alert tags'),
          snoozed: z.boolean().describe('Whether snoozed'),
          count: z.number().describe('Occurrence count'),
          lastOccurredAt: z.string().describe('Last occurrence time'),
          createdAt: z.string().describe('Creation time'),
          updatedAt: z.string().describe('Last update time'),
          priority: z.string().describe('Alert priority'),
          owner: z.string().optional().describe('Alert owner'),
          source: z.string().optional().describe('Alert source')
        })
      ),
      totalCount: z.number().describe('Number of alerts returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let response = await client.listAlerts(ctx.input);
    let data = response.data ?? [];

    let alerts = data.map((a: any) => ({
      alertId: a.id,
      tinyId: a.tinyId,
      alias: a.alias,
      message: a.message,
      status: a.status,
      acknowledged: a.acknowledged ?? false,
      isSeen: a.isSeen ?? false,
      tags: a.tags ?? [],
      snoozed: a.snoozed ?? false,
      count: a.count ?? 1,
      lastOccurredAt: a.lastOccurredAt,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      priority: a.priority,
      owner: a.owner,
      source: a.source
    }));

    return {
      output: {
        alerts,
        totalCount: alerts.length
      },
      message: `Found **${alerts.length}** alerts${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
