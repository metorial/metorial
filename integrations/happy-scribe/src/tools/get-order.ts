import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve details of a transcription, subtitling, or translation order. Returns the full order state, associated transcriptions, operations, pricing details, and ingestion status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('ID of the order to retrieve.')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('ID of the order.'),
      state: z
        .string()
        .describe(
          'Current state of the order (e.g. incomplete, submitted, fulfilled, failed, canceled).'
        ),
      folderId: z
        .string()
        .optional()
        .nullable()
        .describe('ID of the folder containing the order.'),
      operations: z.any().optional().describe('Operations associated with the order.'),
      transcriptions: z
        .any()
        .optional()
        .describe('Transcriptions associated with the order and their states.'),
      ingestions: z.any().optional().describe('File ingestion status for the order.'),
      outputIds: z.array(z.string()).optional().describe('IDs of output transcriptions.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getOrder(ctx.input.orderId);

    return {
      output: {
        orderId: result.id,
        state: result.state,
        folderId: result.folder_id,
        operations: result.operations,
        transcriptions: result.transcriptions,
        ingestions: result.ingestions,
        outputIds: result.outputsIds
      },
      message: `Order **${result.id}** is in state **${result.state}**.`
    };
  })
  .build();
