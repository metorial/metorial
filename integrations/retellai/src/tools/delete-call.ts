import { SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCall = SlateTool.create(spec, {
  name: 'Delete Call',
  key: 'delete_call',
  description: `Delete a call record from your Retell AI account. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      callId: z.string().describe('Unique identifier of the call to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    await client.deleteCall(ctx.input.callId);

    return {
      output: { success: true },
      message: `Deleted call **${ctx.input.callId}**.`
    };
  })
  .build();
