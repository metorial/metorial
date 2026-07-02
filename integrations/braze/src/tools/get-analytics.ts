import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { spec } from '../spec';

export let getKpiAnalytics = SlateTool.create(spec, {
  name: 'Get KPI Analytics',
  key: 'get_kpi_analytics',
  description: `Retrieve key performance indicator (KPI) time series data from Braze. Supports daily active users (DAU), monthly active users (MAU), new users, and session counts over a specified time period.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      metric: z
        .enum(['dau', 'mau', 'new_users', 'sessions'])
        .describe('KPI metric to retrieve'),
      length: z.number().describe('Number of days of data to return (max 100)'),
      endingAt: z
        .string()
        .optional()
        .describe('End date for the data series in ISO 8601 format (defaults to now)'),
      segmentId: z
        .string()
        .optional()
        .describe('Segment ID to filter sessions data (only applicable for sessions metric)')
    })
  )
  .output(
    z.object({
      dataSeries: z.array(z.record(z.string(), z.any())).describe('Daily KPI data points'),
      message: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result: any;

    switch (ctx.input.metric) {
      case 'dau':
        result = await client.getDauDataSeries(ctx.input.length, ctx.input.endingAt);
        break;
      case 'mau':
        result = await client.getMauDataSeries(ctx.input.length, ctx.input.endingAt);
        break;
      case 'new_users':
        result = await client.getNewUsersDataSeries(ctx.input.length, ctx.input.endingAt);
        break;
      case 'sessions':
        result = await client.getSessionsDataSeries(
          ctx.input.length,
          ctx.input.endingAt,
          ctx.input.segmentId
        );
        break;
    }

    let metricLabels: Record<string, string> = {
      dau: 'Daily Active Users',
      mau: 'Monthly Active Users',
      new_users: 'New Users',
      sessions: 'Sessions'
    };

    return {
      output: {
        dataSeries: result.data ?? [],
        message: result.message
      },
      message: `Retrieved **${(result.data ?? []).length}** data points for **${metricLabels[ctx.input.metric]}**.`
    };
  })
  .build();

export let getCustomEventAnalytics = SlateTool.create(spec, {
  name: 'Get Custom Event Analytics',
  key: 'get_custom_event_analytics',
  description: `Retrieve analytics data for a custom event, including occurrence counts over time. Can also list all custom event names configured in your Braze workspace.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'analytics'])
        .describe(
          '"list" to get all event names, "analytics" to get time series data for a specific event'
        ),
      eventName: z
        .string()
        .optional()
        .describe('Name of the custom event (required for analytics action)'),
      length: z
        .number()
        .optional()
        .describe('Number of days of data to return (required for analytics action, max 100)'),
      endingAt: z
        .string()
        .optional()
        .describe('End date for the data series in ISO 8601 format'),
      page: z.number().optional().describe('Page number for pagination (for list action)')
    })
  )
  .output(
    z.object({
      eventNames: z
        .array(z.string())
        .optional()
        .describe('List of custom event names (for list action)'),
      dataSeries: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Event analytics data points (for analytics action)'),
      message: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    if (ctx.input.action === 'list') {
      let result = await client.listCustomEvents(ctx.input.page);
      return {
        output: {
          eventNames: result.events ?? [],
          message: result.message
        },
        message: `Found **${(result.events ?? []).length}** custom event(s).`
      };
    } else {
      let result = await client.getCustomEventAnalytics(
        ctx.input.eventName!,
        ctx.input.length!,
        ctx.input.endingAt
      );
      return {
        output: {
          dataSeries: result.data ?? [],
          message: result.message
        },
        message: `Retrieved **${(result.data ?? []).length}** data points for event **${ctx.input.eventName}**.`
      };
    }
  })
  .build();
