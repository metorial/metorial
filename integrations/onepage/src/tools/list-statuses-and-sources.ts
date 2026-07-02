import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { leadSourceSchema, predefinedItemSchema, statusSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listStatusesAndSources = SlateTool.create(spec, {
  name: 'List Statuses and Lead Sources',
  key: 'list_statuses_and_sources',
  description: `Retrieve the available contact statuses, lead sources, and predefined items (products/services). Use this to look up valid IDs when creating or updating contacts and deals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      include: z
        .array(z.enum(['statuses', 'leadSources', 'predefinedItems']))
        .optional()
        .describe('Which reference lists to include. Defaults to all.')
    })
  )
  .output(
    z.object({
      statuses: z.array(statusSchema).optional().describe('Available contact statuses'),
      leadSources: z.array(leadSourceSchema).optional().describe('Available lead sources'),
      predefinedItems: z
        .array(predefinedItemSchema)
        .optional()
        .describe('Available predefined products/services')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let include = ctx.input.include ?? ['statuses', 'leadSources', 'predefinedItems'];
    let result: any = {};

    if (include.includes('statuses')) {
      result.statuses = await client.listStatuses();
    }
    if (include.includes('leadSources')) {
      result.leadSources = await client.listLeadSources();
    }
    if (include.includes('predefinedItems')) {
      result.predefinedItems = await client.listPredefinedItems();
    }

    let parts: string[] = [];
    if (result.statuses) parts.push(`${result.statuses.length} statuses`);
    if (result.leadSources) parts.push(`${result.leadSources.length} lead sources`);
    if (result.predefinedItems)
      parts.push(`${result.predefinedItems.length} predefined items`);

    return {
      output: result,
      message: `Retrieved ${parts.join(', ')}.`
    };
  })
  .build();
