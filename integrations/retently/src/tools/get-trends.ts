import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTrends = SlateTool.create(spec, {
  name: 'Get Trends',
  key: 'get_trends',
  description: `Retrieve trend groups and detailed trend data. Without a groupId, returns all trend groups. With a groupId, returns detailed trend data including current vs baseline scores, trend lines, and respondent distributions.
Supports various date range presets (today, past-week, past-month, etc.) or custom date ranges.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z
        .string()
        .optional()
        .describe(
          'Trend group ID to get details for (use "default" for the default group). Omit to list all groups.'
        ),
      date: z
        .enum([
          'today',
          'yesterday',
          'past-week',
          'past-month',
          'past-3-months',
          'past-6-months',
          'past-year',
          'this-month-to-date',
          'this-quarter-to-date',
          'this-year-to-date',
          'custom'
        ])
        .optional()
        .describe('Date range preset (required when groupId is provided)'),
      startDate: z
        .string()
        .optional()
        .describe(
          'Custom start date (ISO 8601 or UNIX timestamp, required when date is "custom")'
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          'Custom end date (ISO 8601 or UNIX timestamp, required when date is "custom")'
        )
    })
  )
  .output(
    z.object({
      groups: z
        .array(z.any())
        .optional()
        .describe('List of trend groups (when no groupId specified)'),
      group: z.any().optional().describe('Trend group metadata'),
      trends: z.array(z.any()).optional().describe('Detailed trend data within the group'),
      dateRange: z.any().optional().describe('Date range information for the trend query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (!ctx.input.groupId) {
      let data = await client.getTrendGroups();
      return {
        output: { groups: data.groups },
        message: `Retrieved **${data.groups?.length ?? 0}** trend group(s).`
      };
    }

    let data = await client.getTrends(ctx.input.groupId, {
      date: ctx.input.date,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    return {
      output: {
        group: data.group,
        trends: data.trends,
        dateRange: data.dateRange
      },
      message: `Retrieved **${data.trends?.length ?? 0}** trend(s) for group "${data.group?.groupName ?? ctx.input.groupId}".`
    };
  })
  .build();
