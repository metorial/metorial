import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let suppressionTypeEnum = z.enum([
  'blocklist',
  'hard-bounces',
  'spam-complaints',
  'unsubscribes'
]);

export let getSuppressions = SlateTool.create(spec, {
  name: 'Get Suppression List',
  key: 'get_suppressions',
  description: `Retrieve entries from a suppression list. Supports blocklist, hard bounces, spam complaints, and unsubscribes.
Suppression lists automatically prevent sending to problematic addresses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      suppressionType: suppressionTypeEnum.describe('Type of suppression list to retrieve.'),
      domainId: z.string().optional().describe('Filter by domain ID.'),
      page: z.number().optional().describe('Page number for pagination.'),
      limit: z
        .number()
        .min(10)
        .max(100)
        .optional()
        .describe('Results per page (10-100, default 25).')
    })
  )
  .output(
    z.object({
      entries: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of suppression entries.'),
      total: z.number().describe('Total number of entries.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getSuppressionList(ctx.input.suppressionType, {
      domainId: ctx.input.domainId,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let total =
      ((result.meta as Record<string, unknown>)?.total as number) ??
      (result.data || []).length;

    return {
      output: {
        entries: result.data || [],
        total
      },
      message: `Found **${total}** entries in the **${ctx.input.suppressionType}** suppression list.`
    };
  })
  .build();

export let addToSuppressions = SlateTool.create(spec, {
  name: 'Add to Suppression List',
  key: 'add_to_suppressions',
  description: `Add email addresses or patterns to a suppression list. Prevents future emails from being sent to these addresses.
For blocklist, you can add both specific recipients and wildcard patterns.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      suppressionType: suppressionTypeEnum.describe('Type of suppression list to add to.'),
      domainId: z.string().describe('Domain ID to add the suppression for.'),
      recipients: z.array(z.string()).optional().describe('Email addresses to suppress.'),
      patterns: z
        .array(z.string())
        .optional()
        .describe('Wildcard patterns to suppress (blocklist only, e.g., "*@example.com").')
    })
  )
  .output(
    z.object({
      entries: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Created suppression entries.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.addToSuppressionList(ctx.input.suppressionType, {
      domainId: ctx.input.domainId,
      recipients: ctx.input.recipients,
      patterns: ctx.input.patterns
    });

    let count = (ctx.input.recipients?.length || 0) + (ctx.input.patterns?.length || 0);

    return {
      output: { entries: result.data || [] },
      message: `Added **${count}** entries to the **${ctx.input.suppressionType}** suppression list.`
    };
  })
  .build();

export let removeFromSuppressions = SlateTool.create(spec, {
  name: 'Remove from Suppression List',
  key: 'remove_from_suppressions',
  description: `Remove entries from a suppression list by ID, or clear all entries for a domain. This re-enables sending to previously suppressed addresses.`,
  instructions: [
    'Provide specific entry IDs to remove, or set removeAll to true to clear the entire list for the domain.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      suppressionType: suppressionTypeEnum.describe(
        'Type of suppression list to remove from.'
      ),
      entryIds: z.array(z.string()).optional().describe('IDs of specific entries to remove.'),
      removeAll: z.boolean().optional().describe('Set to true to remove all entries.'),
      domainId: z.string().optional().describe('Domain ID (required when using removeAll).')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the removal was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteFromSuppressionList(ctx.input.suppressionType, {
      ids: ctx.input.entryIds,
      all: ctx.input.removeAll,
      domainId: ctx.input.domainId
    });

    return {
      output: { removed: true },
      message: ctx.input.removeAll
        ? `All entries removed from the **${ctx.input.suppressionType}** suppression list.`
        : `Removed ${ctx.input.entryIds?.length || 0} entries from the **${ctx.input.suppressionType}** suppression list.`
    };
  })
  .build();
