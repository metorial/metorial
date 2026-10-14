import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let getBatchStatus = SlateTool.create(spec, {
  name: 'Get Batch Status',
  key: 'get_batch_status',
  description:
    'Retrieves a queued write batch, including its state, progress, item IDs, and error details. Use the batchId returned by a content or page operation to check pending work. Requires OAuth authentication.',
  tags: { readOnly: true }
})
  .input(z.object({ batchId: z.number().int().positive().describe('Queued write batch ID.') }))
  .output(
    z.object({
      batch: z.record(z.string(), z.any()),
      completed: z.boolean().describe('Whether the batch has finished processing.'),
      success: z.boolean().describe('Whether processing completed without reported errors.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.config.locale,
      region: ctx.auth.region,
      authMethod: ctx.auth.authMethod
    });
    let batch = await client.getBatch(ctx.input.batchId);
    if (!batch || typeof batch !== 'object' || Array.isArray(batch)) {
      throw createApiServiceError('Agility CMS did not return a write batch.');
    }
    let completed = batch.batchState === 3;
    let failed =
      batch.abortYN ||
      batch.errorData ||
      batch.batchState === 4 ||
      (Array.isArray(batch.items) &&
        batch.items.some(item => item.errorMessage || item.itemID < 0));
    return {
      output: { batch, completed, success: completed && !failed },
      message: failed
        ? `Batch **#${ctx.input.batchId}** reported errors. Inspect the batch details.`
        : completed
          ? `Batch **#${ctx.input.batchId}** completed.`
          : `Batch **#${ctx.input.batchId}** is still pending.`
    };
  })
  .build();
