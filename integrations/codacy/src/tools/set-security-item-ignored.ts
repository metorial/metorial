import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let setSecurityItemIgnored = SlateTool.create(spec, {
  name: 'Set Security Item Ignored State',
  key: 'set_security_item_ignored',
  description:
    'Ignore or restore a security finding. Returns the updated finding from Codacy. Call search_security_items to discover item IDs.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      srmItemId: z.string().describe('Security item ID from search_security_items.'),
      ignored: z.boolean().describe('True to ignore the finding, false to restore it.'),
      reason: z
        .enum(['AcceptedUse', 'FalsePositive', 'NotExploitable', 'TestCode', 'ExternalCode'])
        .optional()
        .describe('Reason when ignoring a finding.'),
      comment: z.string().optional().describe('Explanation when ignoring a finding.')
    })
  )
  .output(
    z.object({
      item: z
        .object({
          id: z.string(),
          title: z.string(),
          priority: z.string(),
          status: z.string()
        })
        .passthrough(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    if (
      !ctx.input.ignored &&
      (ctx.input.reason !== undefined || ctx.input.comment !== undefined)
    ) {
      throw createApiServiceError('reason and comment apply only when ignored is true.');
    }
    let client = createClient(ctx);
    let response = ctx.input.ignored
      ? await client.ignoreSecurityItem(ctx.input.srmItemId, {
          reason: ctx.input.reason,
          comment: ctx.input.comment
        })
      : await client.unignoreSecurityItem(ctx.input.srmItemId);
    return {
      output: { item: response.data ?? response, raw: response },
      message: ctx.input.ignored
        ? 'Ignored the security finding.'
        : 'Restored the security finding.'
    };
  })
  .build();
