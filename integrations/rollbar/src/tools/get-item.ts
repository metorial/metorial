import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, mapItem } from '../lib/client';
import { spec } from '../spec';

export let getItem = SlateTool.create(spec, {
  name: 'Get Item',
  key: 'get_item',
  description: `Retrieve detailed information about a specific Rollbar item (grouped error/message). Look up an item by its unique ID, project-specific counter number, or ingestion UUID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .number()
        .optional()
        .describe('Project ID from manage_project; required with an account token.'),
      itemId: z.number().optional().describe('Unique item ID'),
      counter: z.number().optional().describe('Project-specific item counter number'),
      occurrenceUuid: z
        .string()
        .optional()
        .describe(
          '32-character ingestion UUID from create_occurrence; indexed asynchronously.'
        )
    })
  )
  .output(
    z.object({
      itemId: z.number().describe('Unique item ID'),
      projectId: z.number().optional().describe('Project containing the item'),
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
      assignedUserId: z.number().optional().describe('Assigned user ID when present'),
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
    let client = createClient(ctx);

    if (
      ctx.input.itemId === undefined &&
      ctx.input.counter === undefined &&
      !ctx.input.occurrenceUuid
    )
      throw createApiServiceError(
        'Provide itemId, counter, or occurrenceUuid from create_occurrence.'
      );
    const result =
      ctx.input.itemId !== undefined
        ? await client.getItem(ctx.input.itemId)
        : ctx.input.counter !== undefined
          ? await client.getItemByCounter(ctx.input.counter)
          : await client.getItemByUuid(ctx.input.occurrenceUuid!);
    const item = result.result;

    return {
      output: mapItem(item),
      message: `Retrieved item **#${item.counter}**: "${item.title}" (${item.status}, ${mapItem(item).level}, ${item.total_occurrences} occurrences).`
    };
  })
  .build();
