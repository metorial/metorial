import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let publishRecord = SlateTool.create(spec, {
  name: 'Publish or Unpublish Record',
  key: 'publish_record',
  description: `Publish or unpublish a content record. Publishing makes the record available via the Content Delivery API. Unpublishing reverts it to draft status.`,
  instructions: ['Only works for models with the draft/publish workflow enabled.']
})
  .input(
    z.object({
      recordId: z.string().describe('ID of the record to publish or unpublish'),
      action: z
        .enum(['publish', 'unpublish'])
        .describe('Whether to publish or unpublish the record')
    })
  )
  .output(
    z.object({
      record: z.any().describe('The record object after the action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let record =
      ctx.input.action === 'publish'
        ? await client.publishRecord(ctx.input.recordId)
        : await client.unpublishRecord(ctx.input.recordId);

    let title = record.title || record.name || record.id;
    return {
      output: { record },
      message: `${ctx.input.action === 'publish' ? 'Published' : 'Unpublished'} record **${title}** (ID: ${record.id}).`
    };
  })
  .build();
