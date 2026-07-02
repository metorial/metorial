import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient } from './helpers';

export let bulkDelete = SlateTool.create(spec, {
  name: 'Bulk Delete Visitors or Accounts',
  key: 'bulk_delete',
  description: `Permanently delete visitor or account records from Pendo in bulk. All events associated with the specified IDs will be deleted. Deletion is processed in batches and may take up to 21 days for GDPR compliance.`,
  instructions: [
    'The integration key must have write access enabled.',
    'Deleted records may still appear in Pendo until the deletion process completes.'
  ],
  constraints: ['Deletion requests are processed in batches and may take up to 21 days.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      entityType: z
        .enum(['visitor', 'account'])
        .describe('Whether to delete visitors or accounts'),
      entityIds: z
        .array(z.string())
        .min(1)
        .describe('List of visitor or account IDs to delete')
    })
  )
  .output(
    z.object({
      entityType: z.string().describe('The type of entities deleted'),
      requestId: z
        .string()
        .optional()
        .describe('Pendo deletion request ID when returned by the API'),
      deletedCount: z.number().describe('Number of IDs submitted for deletion'),
      success: z.boolean().describe('Whether the deletion request was accepted'),
      raw: z.any().optional().describe('Raw Pendo bulk deletion response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);
    let result: any;

    if (ctx.input.entityType === 'visitor') {
      result = await client.bulkDeleteVisitors(ctx.input.entityIds);
    } else {
      result = await client.bulkDeleteAccounts(ctx.input.entityIds);
    }

    return {
      output: {
        entityType: ctx.input.entityType,
        requestId: result?.id || result?.requestId,
        deletedCount: ctx.input.entityIds.length,
        success: true,
        raw: result
      },
      message: `Submitted **${ctx.input.entityIds.length}** ${ctx.input.entityType}(s) for deletion from Pendo.`
    };
  })
  .build();
