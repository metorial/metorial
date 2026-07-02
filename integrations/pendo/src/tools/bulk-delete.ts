import { SlateTool } from 'slates';
import { z } from 'zod';
import { PendoClient } from '../lib/client';
import { spec } from '../spec';

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
      deletedCount: z.number().describe('Number of IDs submitted for deletion'),
      success: z.boolean().describe('Whether the deletion request was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PendoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.entityType === 'visitor') {
      await client.bulkDeleteVisitors(ctx.input.entityIds);
    } else {
      await client.bulkDeleteAccounts(ctx.input.entityIds);
    }

    return {
      output: {
        entityType: ctx.input.entityType,
        deletedCount: ctx.input.entityIds.length,
        success: true
      },
      message: `Submitted **${ctx.input.entityIds.length}** ${ctx.input.entityType}(s) for deletion from Pendo.`
    };
  })
  .build();
