import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let batchDeleteObjects = SlateTool.create(spec, {
  name: 'Batch Delete Objects',
  key: 'batch_delete_objects',
  description: `Delete multiple objects from a collection that match a given where filter. Supports dry-run mode to preview which objects would be deleted without actually removing them.`,
  instructions: [
    'The where filter uses the same syntax as search filters (path, operator, value*).',
    'Use dryRun=true to preview the deletion without making changes.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection'),
      where: z
        .any()
        .describe(
          'Where filter to match objects for deletion (e.g. { path: ["status"], operator: "Equal", valueText: "archived" })'
        ),
      dryRun: z
        .boolean()
        .optional()
        .describe('If true, preview the deletion without actually removing objects'),
      tenant: z.string().optional().describe('Tenant name for multi-tenant collections')
    })
  )
  .output(
    z.object({
      matched: z.number().describe('Number of objects matching the filter'),
      deleted: z.number().describe('Number of objects deleted (0 if dry run)'),
      dryRun: z.boolean().describe('Whether this was a dry run'),
      failed: z.number().describe('Number of objects that failed to delete')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { collectionName, where, dryRun, tenant } = ctx.input;

    let result = await client.batchDeleteObjects(
      { class: collectionName, where },
      { dryRun, output: 'verbose', tenant }
    );

    let results = result.results || {};
    let matched = results.matches || 0;
    let successful = results.successful || 0;
    let failed = results.failed || 0;

    return {
      output: {
        matched,
        deleted: dryRun ? 0 : successful,
        dryRun: !!dryRun,
        failed
      },
      message: dryRun
        ? `Dry run: **${matched}** object(s) would be deleted from **${collectionName}**.`
        : `Deleted **${successful}** object(s) from **${collectionName}**. ${failed > 0 ? `**${failed}** failed.` : ''}`
    };
  })
  .build();
