import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteService = SlateTool.create(spec, {
  name: 'Delete Service',
  key: 'delete_service',
  description: `Delete a service from eTermin by its ID. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('Service ID to delete')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.any()).describe('API response confirming deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.deleteService(ctx.input.serviceId);

    return {
      output: { result },
      message: `Service **${ctx.input.serviceId}** deleted.`
    };
  })
  .build();
