import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getItem = SlateTool.create(spec, {
  name: 'Get Item',
  key: 'get_item',
  description: `Retrieve detailed information about a specific Rollbar item (grouped error/message). Look up an item by its unique ID or project-specific counter number.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      itemId: z.number().optional().describe('Unique item ID'),
      counter: z.number().optional().describe('Project-specific item counter number')
    })
  )
  .output(
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
      platform: z.string().optional().describe('Platform of the item'),
      hash: z.string().optional().describe('Item hash/fingerprint'),
      assignedUser: z.any().optional().describe('Assigned user details'),
      lastActivatedTimestamp: z
        .number()
        .optional()
        .describe('Unix timestamp of last activation'),
      integrationsData: z
        .any()
        .optional()
        .describe('External integration data (e.g., linked Jira issues)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (!ctx.input.itemId && !ctx.input.counter) {
      throw new Error('Either itemId or counter must be provided');
    }

    let result: any;
    if (ctx.input.itemId) {
      result = await client.getItem(ctx.input.itemId);
    } else {
      result = await client.getItemByCounter(ctx.input.counter!);
    }

    let item = result?.result;

    return {
      output: {
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
        platform: item.platform,
        hash: item.hash,
        assignedUser: item.assigned_user,
        lastActivatedTimestamp: item.last_activated_timestamp,
        integrationsData: item.integrations_data
      },
      message: `Retrieved item **#${item.counter}**: "${item.title}" (${item.status}, ${item.level_string || item.level}, ${item.total_occurrences} occurrences).`
    };
  })
  .build();
