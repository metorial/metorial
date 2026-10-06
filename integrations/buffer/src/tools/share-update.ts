import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let shareUpdateTool = SlateTool.create(spec, {
  name: 'Share Update Now',
  key: 'share_update',
  tags: { readOnly: false },
  description: `Request immediate publication of a pending update that is currently in the queue. This affects the connected social account and retains published history. Acceptance does not confirm delivery; read the post status afterward.`,
  constraints: [
    'Only pending (queued) updates can be shared. Already-sent updates will return an error.'
  ]
})
  .input(
    z.object({
      updateId: z.string().describe('ID of the pending update to share immediately')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether Buffer accepted the publication operation'),
      status: z
        .string()
        .optional()
        .describe('Current API post status at acknowledgment; sent confirms publication.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.shareUpdate(ctx.input.updateId);

    return {
      output: {
        success: result.success,
        status: result.status
      },
      message:
        result.status === 'sent'
          ? `Published update **${ctx.input.updateId}**.`
          : `Buffer accepted the immediate publication request for update **${ctx.input.updateId}**${result.status === undefined ? '' : ` (status: ${result.status})`}. Use Get Updates to verify the final delivery status.`
    };
  })
  .build();
