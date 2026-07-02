import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteService = SlateTool.create(spec, {
  name: 'Delete Service',
  key: 'delete_service',
  description: `Delete one or more scanning services from your CodeREADr account. This permanently removes the service and its configuration.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      serviceId: z
        .string()
        .describe(
          'Service ID to delete. Use comma-separated IDs for multiple, or "all" to delete all services.'
        )
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('ID(s) of the deleted service(s)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteService(ctx.input.serviceId);

    return {
      output: { serviceId: ctx.input.serviceId },
      message: `Deleted service(s) **${ctx.input.serviceId}**.`
    };
  })
  .build();
