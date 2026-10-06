import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateDestinationTool = SlateTool.create(spec, {
  name: 'Update Destination',
  key: 'update_destination',
  tags: { destructive: true },
  description: `Update an existing Airbyte destination connector. Modify the destination name and/or its configuration. Only provided fields will be updated.`
})
  .input(
    z.object({
      destinationId: z.string().describe('The UUID of the destination to update.'),
      name: z.string().optional().describe('New display name for the destination.'),
      configuration: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated destination-specific configuration.')
    })
  )
  .output(
    z.object({
      destinationId: z.string(),
      name: z.string(),
      destinationType: z.string(),
      workspaceId: z.string(),
      configuration: z
        .record(z.string(), z.unknown())
        .describe(
          'Configuration keys with all values redacted. Never reuse these values as connector input.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let updateData: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.configuration !== undefined)
      updateData.configuration = ctx.input.configuration;

    let dest = await client.updateDestination(ctx.input.destinationId, updateData);

    return {
      output: {
        destinationId: dest.destinationId,
        name: dest.name,
        destinationType: dest.destinationType,
        workspaceId: dest.workspaceId,
        configuration: dest.configuration
      },
      message: `Updated destination **${dest.name}** (ID: ${dest.destinationId}).`
    };
  })
  .build();
