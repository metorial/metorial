import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listItems = SlateTool.create(spec, {
  name: 'List Items',
  key: 'list_items',
  description: `List error/message items in a Rollbar project. Items are grouped errors that can be filtered by status, level, and environment. Supports pagination for browsing large result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['active', 'resolved', 'muted', 'archived'])
        .optional()
        .describe('Filter items by status'),
      level: z
        .enum(['debug', 'info', 'warning', 'error', 'critical'])
        .optional()
        .describe('Filter items by level'),
      environment: z.string().optional().describe('Filter items by environment name'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)')
    })
  )
  .output(
    z.object({
      items: z
        .array(
          z.object({
            itemId: z.number().describe('Unique item ID'),
            counter: z.number().describe('Project-specific item counter'),
            title: z.string().describe('Item title/message'),
            status: z.string().describe('Current item status'),
            level: z.string().describe('Severity level'),
            environment: z.string().optional().describe('Environment where item was seen'),
            framework: z.string().optional().describe('Framework that generated the item'),
            totalOccurrences: z.number().describe('Total number of occurrences'),
            lastOccurrenceTimestamp: z
              .number()
              .optional()
              .describe('Unix timestamp of last occurrence'),
            firstOccurrenceTimestamp: z
              .number()
              .optional()
              .describe('Unix timestamp of first occurrence'),
            uniqueOccurrences: z.number().optional().describe('Number of unique occurrences'),
            platform: z.string().optional().describe('Platform of the item')
          })
        )
        .describe('List of items'),
      page: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listItems({
      status: ctx.input.status,
      level: ctx.input.level,
      environment: ctx.input.environment,
      page: ctx.input.page
    });

    let items = (result?.result?.items || []).map((item: any) => ({
      itemId: item.id,
      counter: item.counter,
      title: item.title,
      status: item.status,
      level: item.level_string || item.level,
      environment: item.environment,
      framework: item.framework,
      totalOccurrences: item.total_occurrences,
      lastOccurrenceTimestamp: item.last_occurrence_timestamp,
      firstOccurrenceTimestamp: item.first_occurrence_timestamp,
      uniqueOccurrences: item.unique_occurrences,
      platform: item.platform
    }));

    return {
      output: {
        items,
        page: ctx.input.page || 1
      },
      message: `Found **${items.length}** items${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}${ctx.input.environment ? ` in environment "${ctx.input.environment}"` : ''}.`
    };
  })
  .build();
