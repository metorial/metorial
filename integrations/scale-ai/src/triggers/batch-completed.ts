import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let batchCompleted = SlateTrigger.create(spec, {
  name: 'Batch Completed',
  key: 'batch_completed',
  description:
    "Triggered when Scale AI sends a batch completion callback (i.e., when the last task in a batch is completed). Set this trigger's webhook URL as the callback when creating batches.",
  instructions: ['Use the generated webhook URL as the callback URL when creating batches.']
})
  .input(
    z.object({
      batchName: z.string().describe('Name of the completed batch'),
      status: z.string().describe('Batch status'),
      rawPayload: z.any().describe('Full raw callback payload')
    })
  )
  .output(
    z
      .object({
        batchName: z.string().describe('Name of the completed batch'),
        status: z.string().describe('Batch status'),
        projectName: z.string().optional().describe('Project the batch belongs to')
      })
      .passthrough()
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let batch = body.batch ?? body;
      let batchName = batch.name ?? body.batch_name ?? '';
      let status = batch.status ?? 'completed';

      return {
        inputs: [
          {
            batchName,
            status,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let batch = ctx.input.rawPayload?.batch ?? ctx.input.rawPayload ?? {};

      return {
        type: `batch.${ctx.input.status}`,
        id: `batch-${ctx.input.batchName}-${ctx.input.status}`,
        output: {
          batchName: ctx.input.batchName,
          status: ctx.input.status,
          projectName: batch.project,
          ...batch
        }
      };
    }
  })
  .build();
