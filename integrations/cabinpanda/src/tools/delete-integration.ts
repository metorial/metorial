import { SlateTool } from 'slates';
import { z } from 'zod';
import { CabinPandaClient } from '../lib/client';
import { spec } from '../spec';

export let deleteIntegration = SlateTool.create(spec, {
  name: 'Delete Integration',
  key: 'delete_integration',
  description: `Delete a specific integration by its ID. This removes the connection between a form and an external service. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      integrationId: z.string().describe('The numeric ID of the integration to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the integration was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CabinPandaClient({ token: ctx.auth.token });
    await client.deleteIntegration(ctx.input.integrationId);

    return {
      output: { success: true },
      message: `Deleted integration **${ctx.input.integrationId}**.`
    };
  })
  .build();
