import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { spec } from '../spec';

export let deleteService = SlateTool.create(spec, {
  name: 'Delete Service',
  key: 'delete_service',
  description: `Delete a ClickHouse service. The service **must be stopped** before deletion. Deletion is asynchronous and cannot be undone.`,
  constraints: [
    'The service must be in a stopped state before deletion.',
    'Deletion is asynchronous and irreversible.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteService(ctx.input.serviceId);

    return {
      output: { deleted: true },
      message: `Service **${ctx.input.serviceId}** deletion initiated. This is asynchronous.`
    };
  })
  .build();
