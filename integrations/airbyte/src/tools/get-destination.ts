import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getDestinationTool = SlateTool.create(spec, {
  name: 'Get Destination',
  key: 'get_destination',
  description: `Retrieve detailed information about a specific Airbyte destination connector, including its name, type, workspace, and full configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      destinationId: z.string().describe('The UUID of the destination to retrieve.')
    })
  )
  .output(
    z.object({
      destinationId: z.string(),
      name: z.string(),
      destinationType: z.string(),
      workspaceId: z.string(),
      configuration: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let dest = await client.getDestination(ctx.input.destinationId);

    return {
      output: {
        destinationId: dest.destinationId,
        name: dest.name,
        destinationType: dest.destinationType,
        workspaceId: dest.workspaceId,
        configuration: dest.configuration
      },
      message: `Retrieved destination **${dest.name}** (type: ${dest.destinationType}).`
    };
  })
  .build();
